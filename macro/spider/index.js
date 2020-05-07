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
  type,
  screenshot,
  goto,
  pdf,
  textContent,
  attribute,
  href,
};

const click = async (page, commandArguments) =>
  await page.click(commandArguments[0]);

const type = async (page, commandArguments) =>
  await page.type(commandArguments[0], commandArguments[1]);

const screenshot = async (page, commandArguments) =>
  await page.screenshot({fullPage: true, encode: 'base64'});

const goto = async (page, commandArguments) =>
  await page.goto(commandArguments[0]);

const pdf = async (page, commandArguments) =>
  await page.pdf();

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


exports.handler = async (event) => {
  // const executablePath = event.isOffline
  //   ? './node_modules/puppeteer/.local-chromium/mac-674921/chrome-mac/Chromium.app/Contents/MacOS/Chromium'
  //   : await chromium.executablePath;
  //
  // const browser = await puppeteer.launch({
  //   args: chromium.args,
  //   executablePath
  // });
  //
  // const page = await browser.newPage();
  //

  console.log(event);
};

