<div align="center">

   <img src="https://i.imgur.com/lpP488A.png" alt="AxieHelper" width="640" height="auto">

# AxieHelper

_A Discord Bot for Axie Infinity_

</div>

### Main Features

- Display Player Stats (Crafting Level, Rank, Stamina, SLP, Axies, Battles)
- Display Player Inventory (Charms, Runes, Mintability, Mintability Date)
- Display Axie Information
- Guild's Custom Leaderboard
- Current Season Leaderboard
- Current Event Leaderboard
- Display Token Prices (AXS, RON, SLP, ETH)
- Display User Token Holdings or Assets
- Display User Staked Tokens (AXS, RON/WETH, RON/USDC, RON/SLP, RON/AXS)
- Cards, Charms, Runes Explorer
- Fun Mini Games (Hangman, Guess)

### Demo

https://user-images.githubusercontent.com/90774126/228704377-c09308b0-dadb-44a8-9e98-d2e046b445f1.mp4

## Documentation

[AxieHelper's Documentation](https://docs.axiehelper.com) - Basics, Guides, and Commands List

## Self-hosting

#### Copying the source code

Clone the repository and install the dependencies

```bash
git clone https://github.com/ikr0w/axiehelper
cd axiehelper
npm install
```

#### Set up environment variables

Create a `.env` file and copy the content of `.env.sample`

#### Build the project

```bash
npx prisma generate
npm run build
```

#### Deploying commands

Deploy the bot's commands with:

```bash
npm run deploy:prod
```

#### Launching the bot

💡 It is recommended to launch the bot with process manager such as [PM2](https://pm2.keymetrics.io/)

```bash
npm run prod
```

#### Getting updates

```bash
git pull
npm run build
npm run prod
```

## Self-hosting with Docker

#### Clone the repository

```bash
git clone https://github.com/ikr0w/axiehelper
cd axiehelper
```

#### Set up environment variables

Create a `.env` file and copy the content of `.env.sample`

#### Launching the bot
Build the container and launch the bot with:

```bash
docker compose up -d
```

#### Getting updates

```bash
git pull
docker compose up --force-recreate --build -d
```

## Changelogs & Updates

This bot is actively being developed and a lot of changes are being made. You can follow [#bot-updates](https://discord.gg/xyWaa4rRBy) channel on our Discord server to get notified all about the changes and updates.

## Contribute

Feel free to create issues and pull requests. Any contributions you make are **greatly appreciated**. It can be anything from typo fixes to new features.

You can also help translate AxieHelper to another language.

## Support

If you don't understand something in the documentation or you are experiencing problems, please don't hesitate to [Join our Discord Server](https://discord.gg/xyWaa4rRBy) for help.

[![Discord Banner 2](https://discordapp.com/api/guilds/864194584732106782/widget.png?style=banner2)](https://discord.gg/xyWaa4rRBy)
