# @holepunchto/electron-forge-maker-snap

An electron-forge builder for AppImage.

## Usage

```bash
npm install @holepunchto/electron-forge-maker-appimage --save-dev
```

## forge.config.js

```js
makers: [
  {
    name: '@holepunchto/electron-forge-maker-snap',
    platforms: ['linux'],
    config: {
      snapcraftYamlPath: 'snapcraft.yaml',
      summary: 'Experience secure, private messaging and file sharing without intermediaries',
      description: 'Discover https://Keet.io, the ultimate decentralized, peer-to-peer communication platform. Enjoy secure, private, and efficient messaging and file sharing without intermediaries. Experience true digital privacy and freedom with https://Keet.io',
      contact: 'hello@holepunchto.to',
      license: 'Apache-2.0',
      issues: 'https://support.keet.io/technical-support-and-troubleshooting/submit-a-report',
      website: 'https://keet.io',
      icon: 'build-assets/linux/assets/Keet/Keet-256x256.png',
    },
  },
]
```

## snapcraft.yml

```yml
name: __NAME__
title: __TITLE__
contact: __CONTACT__
license: __LICENSE__
issues: __ISSUES__
website: __WEBSITE__
base: core24
version: __VERSION__
summary: __SUMMARY__
description: __DESCRIPTION__
icon: __ICON__
grade: stable
confinement: strict

parts:
  keet:
    plugin: dump
    source: __SOURCE__
    stage-packages:
      - libatomic1

apps:
  keet:
    command: __BIN__ --no-sandbox
    desktop: __DESKTOP__
    extensions: [gnome]
    plugs:
      - desktop
      - desktop-legacy
      - home
      - x11
      - wayland
      - audio-playback
      - audio-record
      - camera
      - opengl
      - network
      - network-bind
      - browser-support
      - network-status
    environment:
      TMPDIR: $XDG_RUNTIME_DIR
```

## License

Apache-2.0
