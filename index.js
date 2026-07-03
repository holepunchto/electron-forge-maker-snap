const { MakerBase } = require('@electron-forge/maker-base')
const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') {
    return target
  }

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], value)
    } else {
      target[key] = value
    }
  }

  return target
}

function toYaml(json, indent = 0, fragment = '') {
  let yaml = ''
  const keys = Object.keys(json)
  if (keys.length === 0) {
    throw new Error(`Object cannot be empty: ${json}`)
  }
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const value = json[key]

    const currentFragment = fragment === '' ? key : `${fragment}.${key}`

    yaml += ' '.repeat(indent) + `${key}:`

    if (typeof value === 'string') {
      yaml += ` ${value}\n`
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        yaml += ' []\n'
      } else {
        yaml += '\n'
        for (let j = 0; j < value.length; ++j) {
          if (typeof value[j] !== 'string') {
            throw new Error(`Invalid value at ${currentFragment}[${j}]: ${value[j]}`)
          }
          yaml += ' '.repeat(indent + 2) + `- ${value[j]}\n`
        }
      }
    } else if (typeof value === 'object' && value !== null && value !== undefined) {
      yaml += '\n' + toYaml(value, indent + 2, currentFragment)
    } else {
      throw new Error(`Invalid value at ${currentFragment}: ${value}`)
    }
  }
  return yaml
}

class MakerSnap extends MakerBase {
  name = 'snap'

  defaultPlatforms = ['linux']

  requiredExternalBinaries = ['snapcraft', 'lxd']

  isSupportedOnCurrentPlatform() {
    return process.platform === 'linux'
  }

  make({ dir, appName, packageJSON, targetArch, makeDir, forgeConfig }) {
    if (!this.config.icon) {
      throw new Error(`MakerSnap: icon needs to be defined: ${this.config.icon}`)
    }

    if (!fs.existsSync(this.config.icon)) {
      throw new Error(`MakerSnap: icon not found at ${this.config.icon}`)
    }

    if (
      this.config.snapcraft !== null &&
      this.config.snapcraft !== undefined &&
      typeof this.config.snapcraft !== 'object'
    ) {
      throw new Error('MakerSnap: snapcraft must be an object')
    }

    const { app, part, ...root } = this.config.snapcraft || {}

    // Map electron arch to snap arch
    const snapArch = { x64: 'amd64', arm64: 'arm64', armv7l: 'armhf' }[targetArch] || targetArch

    const snapName = appName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const { version } = packageJSON

    // Parse protocols
    const protocols = forgeConfig?.packagerConfig?.protocols || []
    const schemes = protocols.flatMap((p) => p?.schemes || []).filter(Boolean)
    const mimeTypes = schemes.map((s) => `x-scheme-handler/${s}`).join(';')
    const execValue = schemes.length ? `${snapName} %U` : snapName

    // Copy snapcraft.yaml into build dir
    const buildDir = path.dirname(dir)
    const snapDir = path.join(buildDir, 'snap')
    fs.rmSync(snapDir, { recursive: true, force: true })
    fs.mkdirSync(snapDir)

    // Create icon and desktop files in snap/gui
    const iconFile = `${snapName}.png`
    const desktopFile = `${snapName}.desktop`
    const snapGuiPath = 'snap/gui'
    const iconPath = `${snapGuiPath}/${iconFile}`
    const desktopPath = `${snapGuiPath}/${desktopFile}`
    const snapGuiPathAbs = path.join(dir, snapGuiPath)

    const desktop = {
      Name: appName,
      Exec: execValue,
      Icon: `\${SNAP}/meta/gui/${snapName}.png`,
      Type: 'Application',
      ...(mimeTypes ? { MimeType: `${mimeTypes};` } : {})
    }

    const desktopLines = [
      '[Desktop Entry]',
      ...Object.entries(desktop).map(([k, v]) => `${k}=${v}`)
    ]

    fs.mkdirSync(snapGuiPathAbs, { recursive: true })
    fs.copyFileSync(this.config.icon, path.join(snapGuiPathAbs, iconFile))
    fs.writeFileSync(path.join(snapGuiPathAbs, desktopFile), desktopLines.join('\n'), 'utf8')

    // Write snapcraft.yaml into build dir
    const snapcraftConfig = {
      title: appName.replace('-', ' '),
      grade: 'stable',
      confinement: 'strict',
      parts: {
        [snapName]: {
          plugin: 'dump',
          source: path.relative(buildDir, dir)
        }
      },
      apps: {
        [snapName]: {
          command: `${appName} --no-sandbox`,
          desktop: desktopPath
        }
      }
    }

    deepMerge(snapcraftConfig, root)
    deepMerge(snapcraftConfig.apps[snapName], app)
    deepMerge(snapcraftConfig.parts[snapName], part)

    snapcraftConfig.name = snapName
    snapcraftConfig.base = 'core24'
    snapcraftConfig.version = version
    snapcraftConfig.icon = iconPath

    snapcraftConfig.apps[snapName].command = `${appName} --no-sandbox`
    snapcraftConfig.apps[snapName].desktop = desktopPath

    snapcraftConfig.parts[snapName].plugin = 'dump'
    snapcraftConfig.parts[snapName].source = path.relative(buildDir, dir)

    if (this.config.snapcraft?.raw) {
      deepMerge(snapcraftConfig, this.config.snapcraft.raw)
    }

    const snapcraftYamlSource = toYaml(snapcraftConfig)
    fs.writeFileSync(path.join(snapDir, 'snapcraft.yaml'), snapcraftYamlSource)

    const outputFile = path.join(makeDir, `${snapName}_${version}_${snapArch}.snap`)

    if (!fs.existsSync(makeDir)) {
      fs.mkdirSync(makeDir, { recursive: true })
    }

    // Run snapcraft
    execFileSync('sudo', ['-u', process.env.USER, '-E', 'snapcraft', 'pack', '--output', 'make'], {
      cwd: buildDir,
      stdio: 'inherit'
    })

    return [outputFile]
  }
}

module.exports = MakerSnap
