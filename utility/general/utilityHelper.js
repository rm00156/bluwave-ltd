const logger = require('pino')();
const bcrypt = require('bcrypt');
const fs = require('fs');

const { Upload } = require('@aws-sdk/lib-storage');
const { S3Client, /* GetObjectCommand, */ ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

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
  const futureDate = new Date(currentDate.getTime() + amountInMs);

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
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    endpoint: 'https://s3.eu-west-2.amazonaws.com',
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
  const fileName = `${testDevelopment}${folder}/${date}_${encodeURIComponent(file.name)}.${extension}`;
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

async function readSqlFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    logger.error('Error reading SQL file:', error);
    throw error; // Re-throw the error for handling
  }
}

function midnightDate(dt) {
  const dtString = `${dt} 23:59:59`;
  return new Date(dtString);
}

function startOfDay(dt) {
  const dtString = `${dt} 00:00:00`;
  return new Date(dtString);
}

function convertDateToString(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function convertDateTimeToString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function getBusinessDay(date, x) {
  const getPublicHolidays = await fetch('https://www.gov.uk/bank-holidays.json');
  const result = await getPublicHolidays.json();

  const publicHolidays = result['england-and-wales'].events.map((e) => e.date);
  let daysToAdd = x;

  const formatDate = (d) => d.toISOString().split('T')[0];

  while (daysToAdd > 0) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    const formattedDate = formatDate(date);

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !publicHolidays.includes(formattedDate)) {
      daysToAdd -= 1;
    }
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];

  const ordinalSuffix = (days) => {
    if (days > 3 && days < 21) return 'th';
    switch (days % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return `${day}${ordinalSuffix(day)} ${month}`;
}

module.exports = {
  checkNoDuplicateNonZeroNumbers,
  convertDateTimeToString,
  convertDateToString,
  dateXAmountFromNow,
  deleteS3Folder,
  generateHash,
  generateNumberCode,
  getBusinessDay,
  getExtension,
  getTimeDifference,
  hasTheSameItems,
  isEmptyString,
  midnightDate,
  parseCommaSeperatedText,
  pauseForTimeInSecond,
  readSqlFile,
  startOfDay,
  validPassword,
  uploadFile,
};
