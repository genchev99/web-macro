'use strict';

const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

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
  const parsedCommand = command.split(' ');

  if (validateCommand(parsedCommand.slice())) {
    const commandType = parsedCommand.shift();

    await commands[commandType](page, parsedCommand);
  }
};

const commands = {
  click,
};

const click = async (page, commandArguments) =>
  await page.click(commandArguments[0]);



exports.handler = async (event) => {
  const executablePath = event.isOffline
    ? './node_modules/puppeteer/.local-chromium/mac-674921/chrome-mac/Chromium.app/Contents/MacOS/Chromium'
    : await chromium.executablePath;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath
  });

  const page = await browser.newPage();

  await page.goto("https://www.google.com", {
    waitUntil: ["networkidle0", "load", "domcontentloaded"]
  });

  const pdfStream = await page.pdf();

  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      "Content-type": "application/pdf"
    },
    body: pdfStream.toString("base64")
  };
};

