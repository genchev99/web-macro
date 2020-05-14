    'use strict';

    const chromium = require('chrome-aws-lambda');
    const puppeteer = require('puppeteer-core');
    const aws = require('aws-sdk');
    const s3 = new aws.S3({region: 'us-east-1'});
    const resultsS3BucketName = 'results-bucket';

    const click = async (page, commandArguments) => {
      if (commandArguments.indexOf('wait') !== -1) {
        await Promise.all([
          page.click(commandArguments[0]),
          page.waitForNavigation(),
        ]);
      } else {
        await page.click(commandArguments[0]);
      }
    };

    const type = async (page, commandArguments) => await page.type(commandArguments[0], commandArguments[1]);

    const screenshot = async (page, commandArguments) => {
      if (commandArguments && commandArguments.length) {
        const element = await page.$(commandArguments[0]);
        if (element)
          return await element.screenshot({encoding: 'base64'});
        else
          return null;
      }

      return await page.screenshot({fullPage: true, encoding: 'base64'});
    };

    const goto = async (page, commandArguments) => {
      await page.goto(commandArguments[0]);
    };

    const pdf = async (page) => (await page.pdf()).toString();

    const textContent = async (page, commandArguments) =>
      await page.evaluate((selector) =>
        document.querySelector(selector)
        && document.querySelector(selector).textContent
        && document.querySelector(selector).textContent.trim()
        , commandArguments[0]);

    const attribute = async (page, commandArguments) =>
      await page.evaluate((selector, attribute) =>
        document.querySelector(selector)
        && document.querySelector(selector).getAttribute(attribute)
        && document.querySelector(selector).getAttribute(attribute).trim()
        , commandArguments[0], commandArguments[1]);

    const href = async (page, commandArguments) =>
      await page.evaluate((selector) =>
        document.querySelector(selector)
        && document.querySelector(selector).href
        && document.querySelector(selector).href.trim()
        , commandArguments[0]);

    const commands = {
      click,
      type,
      screenshot,
      goto,
      pdf,
      textContent,
      attribute,
      href,
    };

    const validateCommand = (commandArguments) => {
      const commandType = commandArguments.shift();
      return commandType === 'click' && commandArguments.length >= 1
        || commandType === 'type' && commandArguments.length >= 2
        || commandType === 'screenshot' && commandArguments.length >= 0
        || commandType === 'goto' && commandArguments.length >= 1
        || commandType === 'pdf' && commandArguments.length >= 0
        || commandType === 'textContent' && commandArguments.length >= 1
        || commandType === 'attribute' && commandArguments.length >= 1
        || commandType === 'href' && commandArguments.length >= 1;
    };

    const parseCommand = async (page, command) => {
      const split = command.split(' ');

      if (validateCommand(split.slice())) {
        const t = split.shift();
        return await commands[t](page, split);
      } else {
        throw `Unsupported command: ${command}`;
      }
    };

    const getS3Object = async (bucket, key) => {
      if (!bucket || !key) {
        throw "Bucket or key not provided";
      }

      const params = {
        Bucket: bucket,
        Key: key,
      };

      const {Body} = await s3.getObject(params).promise();

      return JSON.parse(Body.toString());
    };

    const saveResultToS3 = async (bucket, key, object = {}) => {
      if (!bucket || !key) {
        throw "Bucket or key not provided";
      }

      const params = {
        Bucket: bucket,
        Body: JSON.stringify(object),
        Key: key,
      };

      await s3.putObject(params).promise();
    };

    exports.handler = async (event) => {
      // const executablePath = event.isOffline
      //   ? './node_modules/puppeteer/.local-chromium/mac-674921/chrome-mac/Chromium.app/Contents/MacOS/Chromium'
      //   : await chromium.executablePath;
      //
      // const browser = await puppeteer.launch({
      //   args: [...chromium.args, '--single-process'],
      //   executablePath
      // });
      const result = {};
      const browser = await chromium.puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });

      try {
        const page = await browser.newPage();

        const {
          Records
        } = event || {};

        const recs = Records
          .map(record => JSON.parse(JSON.parse(record.body).Message).Records)
          .flat()
          .map(payload => ({bucketName: payload.s3.bucket.name, key: payload.s3.object.key}));

        const s3Objects = await Promise.all(recs.map(record => getS3Object(record.bucketName, record.key)));
        const {requested_by, commands} = s3Objects[0];

        for (const command of commands) {
          console.log('command: ', command);
          if (command.indexOf(' as ') !== -1) {
            const attr = command.split(' as ');
            const res_key = attr.pop().trim();
            result[res_key] = await parseCommand(page, attr[0]);
          } else {
            await parseCommand(page, command);
          }
        }

        await Promise.all(s3Objects.map(object => saveResultToS3('production-' + resultsS3BucketName, `${requested_by.replace(' ', '-')}-${(new Date()).getTime()}.json`, {
          result,
          object
        })))
      } catch (e) {
        console.error(e);
      }
      await browser.close();
    };
