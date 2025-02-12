#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const Table = require('cli-table3');
const ora = require('ora');
require('dotenv').config({ path: path.join(os.homedir(), '.mobilism', '.env') });

puppeteer.use(StealthPlugin());

// Ensure config directory exists
const configDir = path.join(os.homedir(), '.mobilism');
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

async function getUserInput(prompt) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(prompt, answer => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

function getCurrentUTCDateTime() {
    const now = new Date();
    return now.toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, '');
}

function parseTopic(topicText) {
    let title = topicText;
    let type = '';
    let author = '';
    let narrator = '';

    // Extract type from parentheses - get only the content inside last () without the dot
    const typeMatch = title.match(/\(([^)]+)\)/g);
    if (typeMatch) {
        // Get the last parentheses match and remove any dots
        type = typeMatch[typeMatch.length - 1]
            .replace(/[()]/g, '')  // Remove parentheses
            .replace(/\./g, '')    // Remove dots
            .trim()                // Remove any extra spaces
            .toUpperCase();        // Convert to uppercase for consistency
        
        // Remove the type and any other parentheses content from title
        title = title.replace(/\s*\([^)]+\)/g, '');
    }

    // Split by "by" to separate title and author
    let parts = title.split(' by ');
    if (parts.length > 1) {
        title = parts[0].trim();
        let authorPart = parts[1];

        // Check for narrator
        if (authorPart.toLowerCase().includes('narrator:')) {
            let narratorParts = authorPart.split(/narrator:/i);
            author = narratorParts[0].trim();
            narrator = narratorParts[1].trim();
        } else {
            author = authorPart.trim();
        }
    }

    // Remove any remaining parentheses content from title, author, and narrator
    title = title.replace(/\s*\([^)]+\)/g, '').trim();
    author = author.replace(/\s*\([^)]+\)/g, '').trim();
    narrator = narrator.replace(/\s*\([^)]+\)/g, '').trim();

    return {
        title: title,
        author: author,
        narrator: narrator,
        type: type
    };
}

function printHeader() {
    console.log(`Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${getCurrentUTCDateTime()}`);
    console.log(`Current User's Login: ${process.env.MOBILISM_USERNAME}\n`);
}

function printTopics(uniqueTopics) {
    const table = new Table({
        head: [
            chalk.blue('No.'),
            chalk.blue('Title'),
            chalk.blue('Author'),
            chalk.blue('Narrator'),
            chalk.blue('Type')
        ],
        wordWrap: true,
        wrapOnWordBoundary: true,
        style: { 'padding-left': 1, 'padding-right': 1 }
    });

    uniqueTopics.forEach((topic, index) => {
        const parsed = parseTopic(topic.text);
        table.push([
            chalk.yellow(index + 1),
            chalk.white(parsed.title),
            chalk.cyan(parsed.author || '-'),
            chalk.magenta(parsed.narrator || '-'),
            chalk.green(parsed.type)
        ]);
    });

    console.log(table.toString());
}

function printSelectedTopic(topic, groupedLinks) {
    const parsed = parseTopic(topic.text);
    
    const detailsTable = new Table({
        style: { 'padding-left': 1, 'padding-right': 1 }
    });

    detailsTable.push(
        { [chalk.blue('Title')]: chalk.white(parsed.title) },
        { [chalk.blue('Author')]: chalk.cyan(parsed.author || '-') },
        { [chalk.blue('Narrator')]: chalk.magenta(parsed.narrator || '-') },
        { [chalk.blue('Type')]: chalk.green(parsed.type) },
        { [chalk.blue('Forum URL')]: chalk.gray(topic.href) }
    );

    console.log(detailsTable.toString());

    if (Object.keys(groupedLinks).length > 0) {
        console.log('\nDownload Links:\n');

        Object.entries(groupedLinks).forEach(([host, links]) => {
            console.log(chalk.yellow(`\n${host}:`));
            links.forEach(link => {
                if (link.includes('\n')) {
                    const [filename, url] = link.split('\n   ');
                    console.log(chalk.white(`└─ ${chalk.cyan(filename)}`));
                    console.log(chalk.gray(`   └─ ${url}`));
                } else {
                    console.log(chalk.gray(`└─ ${link}`));
                }
            });
        });
    }
}

async function loginAndSearch(initialKeyword = null) {
    let browser;
    const spinner = ora();

    try {
        spinner.start('Launching browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        spinner.succeed();

        while (true) {
            console.clear();
            printHeader();

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            spinner.start('Logging in to Mobilism...');
            const loginUrl = 'https://forum.mobilism.org/ucp.php?mode=login';
            await page.goto(loginUrl, { waitUntil: 'networkidle0' });

            const username = process.env.MOBILISM_USERNAME;
            const password = process.env.MOBILISM_PASSWORD;

            if (!username || !password) {
                spinner.fail('Login failed');
                throw new Error('Credentials not found. Please run: mobilism-setup');
            }

            await page.type('#username', username);
            await page.type('#password', password);
            await page.click('label[for="autologin"]');
            await page.click('#load');

            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            spinner.succeed();

            const cookies = await page.cookies();
            fs.writeFileSync(path.join(configDir, 'cookies.json'), JSON.stringify(cookies, null, 2));

            const keyword = initialKeyword || await getUserInput('Enter search term: ');
            initialKeyword = null;

            spinner.start('Searching...');
            const searchUrl = `https://forum.mobilism.org/search.php?keywords="${encodeURIComponent(keyword)}"&sr=topics&sf=titleonly`;
            await page.goto(searchUrl, { waitUntil: 'networkidle0' });

            await new Promise(resolve => setTimeout(resolve, 5000));
            spinner.succeed();

            const topics = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="viewtopic.php?f="]'));
                return links
                    .map(a => ({
                        href: a.href.split('&hilit=')[0],
                        text: a.textContent.trim()
                    }))
                    .filter(link =>
                        link.text &&
                        link.text.length > 0 &&
                        !link.text.includes('Jump to post') &&
                        !link.text.includes('The team') &&
                        !link.href.includes('#unread') &&
                        !link.href.includes('#p')
                    );
            });

            if (topics.length === 0) {
                console.log('No matching topics found.');
                console.log('\n1. New search');
                console.log('2. Exit');
                const nextAction = await getUserInput('\nEnter your choice (1 or 2): ');

                if (nextAction === '2') {
                    console.log('Goodbye!');
                    return;
                }
                console.clear();
                await page.close();
                continue;
            }

            const uniqueTopics = Array.from(
                new Map(topics.filter(topic => topic.text.length > 0)
                    .map(item => [item.href, item]))
                    .values()
            );

            let viewingResults = true;
            while (viewingResults) {
                printTopics(uniqueTopics);

                const selection = await getUserInput(
                    '\nSelect a topic number to check for download links' +
                    ' (or type \'n\' for new search, \'q\' to quit): '
                );

                if (selection === 'q') {
                    console.log('Goodbye!');
                    return;
                } else if (selection === 'n') {
                    viewingResults = false;
                    console.clear();
                    continue;
                }

                const selectedTopic = uniqueTopics[parseInt(selection) - 1];

                if (!selectedTopic) {
                    console.log('Invalid selection. Please try again.');
                    continue;
                }

                spinner.start('Fetching download links...');
                await page.goto(selectedTopic.href, { waitUntil: 'networkidle0' });
                spinner.succeed();

                const downloadLinks = await page.evaluate(() => {
                    const fileHosts = [
                        'uploadrar.com',
                        'sendit.cloud',
                        'rapidgator.net',
                        'rg.to',
                        'filedot.to',
                        'dropgalaxy.vip',
                        'devuploads.com',
                        'novafile.org',
                        'nfile.cc',
                        'uploady.io',
                        'katfile.com',
                        'upfiles.com',
                        'filefactory.com',
                        'uploda.sh'
                    ];

                    const getHostFromUrl = (url) => {
                        return fileHosts.find(host => url.includes(host));
                    };

                    const links = new Set();

                    document.querySelectorAll('a[href]').forEach(a => {
                        const href = a.href;
                        const host = getHostFromUrl(href);
                        if (host) {
                            links.add(JSON.stringify({
                                host: host,
                                url: href,
                                filename: a.textContent.trim() || href.split('/').pop()
                            }));
                        }
                    });

                    return Array.from(links).map(link => JSON.parse(link));
                });

                if (downloadLinks.length > 0) {
                    const groupedLinks = downloadLinks.reduce((acc, link) => {
                        if (!acc[link.host]) {
                            acc[link.host] = [];
                        }
                        const displayUrl = link.filename && link.filename !== link.url
                            ? `${link.filename}\n   ${link.url}`
                            : link.url;

                        if (!acc[link.host].includes(displayUrl)) {
                            acc[link.host].push(displayUrl);
                        }
                        return acc;
                    }, {});

                    printSelectedTopic(selectedTopic, groupedLinks);
                } else {
                    printSelectedTopic(selectedTopic, {});
                    console.log('\nNo download links found in this topic.');
                }

                console.log('\n1. View another search result');
                console.log('2. New search');
                console.log('3. Exit');
                const nextAction = await getUserInput('\nEnter your choice (1-3): ');

                if (nextAction === '3') {
                    console.log('Goodbye!');
                    return;
                } else if (nextAction === '2') {
                    viewingResults = false;
                    console.clear();
                }
            }

            await page.close();
        }

    } catch (error) {
        spinner.fail('An error occurred');
        console.error('\nError:', error);
    } finally {
        if (browser) {
            spinner.start('Cleaning up...');
            await browser.close();
            spinner.succeed();
        }
    }
}

const keyword = process.argv[2];
loginAndSearch(keyword);
