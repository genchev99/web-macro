const express = require('express');
const router = express.Router();
const aws = require('aws-sdk');
const s3 = new aws.S3({
  accessKeyId: process.env.aws_access_key_id,
  secretAccessKey: process.env.aws_secret_access_key,
  sessionToken: process.env.aws_session_token,
  region: 'us-east-1',
});

router.post('/', (req, res) => {
  console.log(req.body);
  res.send(req.body);
});

router.get('/', async (req, res) => {
  const params = {
    Bucket: `${process.env.Environment}-results-bucket`,
    MaxKeys: 2
  };

  const objects = await s3.listObjectsV2(params).promise();
  console.log(objects);

  res.json(objects);
});

module.exports = router;
