const { Worker } = require('bullmq');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const Job = require('../models/Job');
const User = require('../models/User');
const { mediaQueue, connection } = require('../config/queue');

const { PDFDocument } = require('pdf-lib');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const uploadDir = path.join(__dirname, '../../uploads');

const processJobLogic = async (jobData) => {
  const { jobId } = jobData;
  const dbJob = await Job.findById(jobId);
  if (!dbJob || dbJob.status === 'completed') return;

  try {
    dbJob.status = 'processing';
    await dbJob.save();

    const options = dbJob.options || {};
    let outputFilename = '';
    const outputId = Date.now();


      const inputPath = path.join(uploadDir, dbJob.inputPath);
      let extension = path.extname(dbJob.inputPath);
      if (dbJob.type === 'image' && options.format) extension = `.${options.format}`;
      if (dbJob.type === 'video' && options.format) extension = `.${options.format}`;
      if (dbJob.operation === 'extract-audio') extension = '.mp3';
      if (dbJob.type === 'audio' && options.format) extension = `.${options.format}`;
      if (dbJob.type === 'pdf' && dbJob.operation === 'pdf-to-img') extension = `.${options.format || 'png'}`;
      if (dbJob.type === 'pdf' && (dbJob.operation === 'merge' || dbJob.operation === 'img-to-pdf')) extension = '.pdf';

      outputFilename = `output-${outputId}-${dbJob.inputPath.split('-').pop().split('.')[0]}${extension}`;
      const outputPath = path.join(uploadDir, outputFilename);

      if (dbJob.type === 'image') {
        if (dbJob.operation === 'make-gif') {
          const files = dbJob.inputPath.split(',').map(f => path.join(uploadDir, f.trim()));
          if (files.length === 0) throw new Error('No files provided for GIF');
          
          extension = '.gif';
          outputFilename = `output-${outputId}.gif`;
          const finalOutputPath = path.join(uploadDir, outputFilename);
          
          await new Promise((resolve, reject) => {
            const command = ffmpeg();
            const delay = parseFloat(options.delay || 500) / 1000;
            const fps = 1 / delay;

            files.forEach(f => {
              if (fs.existsSync(f)) {
                command.input(f).inputOptions([`-loop 1`, `-t ${delay}`]);
              }
            });

            // Advanced filter: Normalize format, scale, and timebase for every frame
            const filter = files.map((_, i) => 
              `[${i}:v]format=rgba,scale=500:500:force_original_aspect_ratio=decrease,pad=500:500:(ow-iw)/2:(oh-ih)/2,setsar=1,settb=1/${Math.round(fps)},setpts=N/(${Math.round(fps)}*TB)[v${i}];`
            ).join('') +
            files.map((_, i) => `[v${i}]`).join('') + 
            `concat=n=${files.length}:v=1:a=0,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;

            command
              .outputOptions([
                '-filter_complex', filter,
                '-loop', options.loop || 0,
                '-f', 'gif'
              ])
              .on('end', resolve)
              .on('error', (err) => {
                console.error('[FFMPEG GIF ERROR]', err.message);
                reject(err);
              })
              .save(finalOutputPath);
          });
        }
 else {
          let instance = sharp(inputPath);
          const metadata = await instance.metadata();

          if (dbJob.operation === 'crop') {
            const { width, height, x, y } = options;
            instance = instance.extract({ 
              width: parseInt(width), 
              height: parseInt(height), 
              left: parseInt(x), 
              top: parseInt(y) 
            });
          } else if (dbJob.operation === 'resize') {
            instance = instance.resize(parseInt(options.width), parseInt(options.height));
          } else if (dbJob.operation === 'enlarge') {
            const factor = options.factor || 2;
            instance = instance.resize(Math.round(metadata.width * factor), null, { kernel: 'lanczos3' });
          }

          await instance
            .toFormat(options.format || 'webp', { quality: options.quality || 80 })
            .toFile(outputPath);
        }
      } else if (dbJob.type === 'video') {
        await new Promise((resolve, reject) => {
          let command = ffmpeg(inputPath);
          
          if (dbJob.operation === 'extract-audio') {
            command.toFormat('mp3');
          } else if (dbJob.operation === 'crop') {
            const { width, height, x, y, format } = options;
            command.videoFilters(`crop=${width}:${height}:${x}:${y}`);
            if (format) command.toFormat(format);
          } else if (dbJob.operation === 'trim') {
            const start = parseFloat(options.start) || 0;
            const end = parseFloat(options.end);
            const format = options.format;

            if (start > 0) command.seekInput(start);
            if (!isNaN(end) && end > start) {
              command.duration(end - start);
            }
            
            if (format) command.toFormat(format);
          } else if (options.format) {
            command.toFormat(options.format);
          }

          command.on('progress', (p) => { 
              if (p.percent) {
                dbJob.progress = Math.round(p.percent); 
                dbJob.save().catch(() => {}); 
              }
            })
            .on('end', resolve)
            .on('error', (err) => {
              console.error(`[FFMPEG ERROR] ${err.message}`);
              reject(err);
            })
            .save(outputPath);
        });
      } else if (dbJob.type === 'audio') {
        const { startTime, endTime, duration } = options;
        await new Promise((resolve, reject) => {
          let command = ffmpeg(inputPath);
          
          if (dbJob.operation === 'trim-audio') {
            if (startTime) command = command.setStartTime(startTime);
            if (endTime && !duration) {
              // Calculate duration if endTime is provided
              // Note: setDuration takes seconds or hh:mm:ss
              // For simplicity in the worker, we'll assume seconds for now
              command = command.setDuration(endTime - (startTime || 0));
            } else if (duration) {
              command = command.setDuration(duration);
            }
          }

          command.toFormat(options.format || 'mp3')
            .on('end', resolve)
            .on('error', (err) => {
              console.error('Audio Processing Error:', err.message);
              reject(err);
            })
            .save(outputPath);
        });
      } else if (dbJob.type === 'pdf') {
        console.log(`[WORKER] Starting PDF Operation: ${dbJob.operation}`);
        if (dbJob.operation === 'merge') {
          const files = dbJob.inputPath.split(',').map(f => path.join(uploadDir, f.trim()));
          const mergedPdf = await PDFDocument.create();
          for (const f of files) {
            if (!fs.existsSync(f)) continue;
            const pdfBytes = fs.readFileSync(f);
            const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
          }
          const mergedPdfBytes = await mergedPdf.save();
          fs.writeFileSync(outputPath, mergedPdfBytes);
        } else if (dbJob.operation === 'img-to-pdf') {
          const files = dbJob.inputPath.split(',').map(f => path.join(uploadDir, f.trim()));
          const pdfDoc = await PDFDocument.create();
          for (const f of files) {
            if (!fs.existsSync(f)) continue;
            const imgBytes = fs.readFileSync(f);
            let image;
            try {
              // Try PNG first, fallback to JPG
              image = await pdfDoc.embedPng(imgBytes);
            } catch (e) {
              image = await pdfDoc.embedJpg(imgBytes);
            }
            
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
          }
          const pdfBytes = await pdfDoc.save();
          fs.writeFileSync(outputPath, pdfBytes);
        } else if (dbJob.operation === 'pdf-to-img') {
          throw new Error('PDF-to-Image extraction is currently being upgraded for multi-page support. Please try Merge or Img-to-PDF.');
        } else if (dbJob.operation === 'compress') {
          const pdfBytes = fs.readFileSync(inputPath);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true });
          fs.writeFileSync(outputPath, compressedPdfBytes);
        }
      }


    dbJob.status = 'completed';
    dbJob.outputUrl = outputFilename;
    await dbJob.save();
    await User.findByIdAndUpdate(dbJob.userId, { $inc: { usageCount: 1 } });
    console.log(`[WORKER] ✅ Job ${jobId} finished.`);
  } catch (error) {
    console.error(`[WORKER] ❌ Job ${jobId} failed:`, error.message);
    dbJob.status = 'failed';
    dbJob.error = error.message || 'Processing failed';
    await dbJob.save().catch(() => {});
  }
};

if (connection) {
  new Worker('media-processing', async (job) => { await processJobLogic(job.data); }, { connection });
} else if (mediaQueue && mediaQueue.setProcessor) {
  mediaQueue.setProcessor(processJobLogic);
}

module.exports = {};
