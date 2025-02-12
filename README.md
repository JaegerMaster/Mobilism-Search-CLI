# Mobilism Search CLI

A command-line tool for searching and downloading from Mobilism forums. This tool automates the process of searching for content and extracting download links from various file hosts.

## Features

- Automated login to Mobilism forums
- Search functionality with exact title matching
- Extraction of download links from various file hosts
- Secure credential storage
- Cookie management for persistent sessions
- Download link grouping by file host
- Clean and organized output format

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- A valid Mobilism forum account

## Supported File Hosts

The tool automatically detects and organizes links from the following file hosts:
- uploadrar.com
- sendit.cloud
- rapidgator.net / rg.to
- filedot.to
- dropgalaxy.vip
- devuploads.com
- novafile.org / nfile.cc
- uploady.io
- katfile.com
- upfiles.com
- filefactory.com
- uploda.sh

## Installation

1. Clone the repository:
```bash
git clone git@github.com:JaegerMaster/Mobilism-Search-CLI.git
cd Mobilism-Search-CLI
```

2. Install dependencies:
```bash
npm install
```

3. Install globally:
```bash
npm install -g .
```

## Initial Setup

1. Run the setup command:
```bash
mobilism-setup
```

2. Enter your Mobilism forum credentials when prompted:
```
Mobilism Search Setup

Enter your Mobilism username: your_username
Enter your Mobilism password: your_password

Setup complete! Configuration saved to: /home/your_user/.mobilism/.env
```

## Usage

### Basic Search
```bash
mobilism-search "Exact Book Title"
```

Example:
```bash
mobilism-search "Project Hail Mary"
```

### Output Format

The tool provides organized output in the following format:

```
Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): 2025-02-12 09:27:09
Current User's Login: JaegerMaster

Found Topics:
1. Project Hail Mary by Andy Weir (.EPUB)
   URL: https://forum.mobilism.org/viewtopic.php?f=1259&t=4468955

Select a topic number to check for download links: 1

Download Links:

rapidgator.net:
Project_Hail_Mary.epub
   https://rapidgator.net/file/example1234/Project_Hail_Mary.epub.html

uploadrar.com:
Project_Hail_Mary.epub
   https://uploadrar.com/example5678/Project_Hail_Mary.epub
```

## Configuration

### Location
All configuration files are stored in the `~/.mobilism/` directory:
- Credentials: `.env` file
- Session data: `cookies.json`

### Environment Variables
The tool uses the following environment variables:
- `MOBILISM_USERNAME`: Your Mobilism forum username
- `MOBILISM_PASSWORD`: Your Mobilism forum password

## Troubleshooting

### Common Issues

1. "No matching topics found"
   - Try using the exact title in quotes
   - Check for typos in the search term
   - Verify that you're logged in correctly

2. "Credentials not found"
   - Run `mobilism-setup` again
   - Check if `.mobilism/.env` exists in your home directory

3. "Authentication failed"
   - Verify your credentials
   - Run `mobilism-setup` to update credentials

### Manual Cookie Cleanup
If you experience login issues, you can clear the stored cookies:
```bash
rm ~/.mobilism/cookies.json
```

## Uninstallation

1. Remove the global installation:
```bash
npm uninstall -g mobilism-search
```

2. Delete configuration files:
```bash
rm -rf ~/.mobilism
```

## Security Notes

- Credentials are stored locally in your home directory
- Passwords are stored in plain text in the .env file
- Use appropriate file permissions for the .mobilism directory
- Never share your .mobilism directory or its contents

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for personal use only. Make sure to comply with Mobilism's terms of service and your local laws and regulations regarding content downloads.
