#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const chalk = require('chalk');

const configDir = path.join(os.homedir(), '.mobilism');
const envPath = path.join(configDir, '.env');

async function getUserInput(prompt) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(prompt, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function setup() {
    console.log(chalk.bgBlue.white.bold('\n MOBILISM SETUP ') + '\n');

    try {
        // Create config directory if it doesn't exist
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // Get credentials from user
        const username = await getUserInput(chalk.blue('Enter your Mobilism username: '));
        const password = await getUserInput(chalk.blue('Enter your Mobilism password: '));

        // Create or update .env file
        const envContent = `MOBILISM_USERNAME=${username}\nMOBILISM_PASSWORD=${password}`;
        fs.writeFileSync(envPath, envContent);

        // Set appropriate permissions
        fs.chmodSync(envPath, 0o600);

        console.log(chalk.green('\n✔ Setup complete!'));
        console.log(chalk.gray(`Configuration saved to: ${envPath}`));

        // Delete any existing cookies file to force new login
        const cookiesPath = path.join(configDir, 'cookies.json');
        if (fs.existsSync(cookiesPath)) {
            fs.unlinkSync(cookiesPath);
        }

    } catch (error) {
        console.error(chalk.red('\n✖ Setup failed:'), error.message);
        process.exit(1);
    }
}

setup();
