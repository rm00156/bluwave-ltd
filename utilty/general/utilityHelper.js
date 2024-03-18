const logger = require('pino')();
const bcrypt = require('bcrypt');
const { Upload } = require('@aws-sdk/lib-storage');
const {
  S3Client, /* GetObjectCommand, */ ListObjectsV2Command, DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');

const env = process.env.NODE_ENV || 'development';
const TEST = 'test';
const DEVELOPMENT = 'development';

function generateNumberCode() {
  let result = '';
  const characters = '23456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 7; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function generateHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

function dateXAmountFromNow(amountInMs) {
  const currentTime = Date.now();

  // Create a new Date object using the current timestamp
  const currentDate = new Date(currentTime);

  // Add one hour to the current date
  const futureDate = new Date(currentDate.getTime() + (amountInMs));

  return futureDate;
}

function validPassword(account, password) {
  return bcrypt.compareSync(password, account.password);
}

function hasTheSameItems(list1, list2) {
  return list1.length === list2.length && list1.every((item) => list2.includes(item));
}

function pauseForTimeInSecond(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

function parseCommaSeperatedText(text) {
  if (!text) return [];
  const textSplit = text.split(',');

  if (textSplit.length === 0) return [textSplit];

  return textSplit;
}

function checkNoDuplicateNonZeroNumbers(arr) {
  // Create a set to keep track of seen elements (excluding 0)
  const seen = new Set();
  // Create a set to keep track of seen non-zero elements
  const nonZeroSeen = new Set();

  // Check if every element in the array satisfies the conditions
  return arr.every((num) => {
    if (num === 0) {
      // Ignore 0 and continue to the next element
      return true;
    }

    if (nonZeroSeen.has(num)) {
      // If any non-zero number is already seen, return false
      return false;
    }

    // Add non-zero numbers to the seen set
    nonZeroSeen.add(num);
    if (seen.has(num)) {
      // If any non-zero number is already seen (including 0), return false
      return false;
    }

    // Add all numbers (including 0) to the seen set
    seen.add(num);
    return true; // Indicate that the condition is satisfied for this element
  });
}

function getTimeDifference(date) {
  const currentDate = new Date();
  const timeDifference = currentDate.getTime() - date.getTime();

  const minutes = Math.floor(timeDifference / (1000 * 60));
  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  const hours = Math.floor(timeDifference / (1000 * 60 * 60));
  if (hours < 24) {
    return `${hours} hours ago`;
  }

  const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  return `${days} days ago`;
}

function getExtension(mimeType) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpeg';
    case '.jpeg':
      return 'jpeg';
    case 'image/png':
      return 'png';
    case 'application/pdf':
      return 'pdf';
    case '.pdf':
      return 'pdf';
    default:
      return 'png';
  }
}

function isEmptyString(str) {
  // Trim the string to remove whitespace characters from the beginning and end
  const trimmedStr = str.trim();

  // Check if the trimmed string is empty
  return trimmedStr === '';
}

function createNewS3Client() {
  return new S3Client({
    region: process.env.region,
    credentials: {
      secretAccessKey: process.env.secretAccessKey,
      accessKeyId: process.env.accessKeyId,
    },
    endpoint: process.env.s3_endpoint,
  });
}

async function deleteS3Folder(folderPrefix) {
  try {
    const s3 = createNewS3Client();
    const params = {
      Bucket: process.env.S3_BUCKET,
      Prefix: folderPrefix,
    };
    // List all objects in the specified prefix
    const objects = await s3.send(new ListObjectsV2Command(params));
    // Check if there are any objects to delete
    if (objects.Contents.length === 0) {
      logger.error('Folder is already empty.');
      return;
    }

    // Prepare the list of objects to be deleted
    const deleteParams = {
      Bucket: process.env.S3_BUCKET,
      Delete: { Objects: objects.Contents.map((obj) => ({ Key: obj.Key })) },
    };
    // Delete the objects
    await s3.send(new DeleteObjectsCommand(deleteParams));
  } catch (error) {
    logger.error('Error:', error.message);
  }
}

async function uploadFile(folder, file) {
  const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    endpoint: 'https://s3.eu-west-2.amazonaws.com',
  });
  const date = Date.now();
  let testDevelopment = '';
  if (env === TEST || env === DEVELOPMENT) {
    testDevelopment = `${env}/`;
  }

  const blob = file.data;
  const extension = getExtension(file.mimetype);
  const fileName = `${testDevelopment}${folder}/${date}_${encodeURIComponent(
    'home_page_display_option_picture',
  )}.${extension}`;
  const s3Path = `${process.env.S3_BUCKET_PATH}/${fileName}`;

  const params = {
    Bucket: process.env.S3_BUCKET,
    Body: blob,
    Key: fileName,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Upload({
    client: s3,
    params,
  }).done();

  await s3UploadPromise;

  return s3Path;
}

module.exports = {
  checkNoDuplicateNonZeroNumbers,
  dateXAmountFromNow,
  deleteS3Folder,
  generateHash,
  generateNumberCode,
  getExtension,
  getTimeDifference,
  hasTheSameItems,
  isEmptyString,
  parseCommaSeperatedText,
  pauseForTimeInSecond,
  validPassword,
  uploadFile,
};
