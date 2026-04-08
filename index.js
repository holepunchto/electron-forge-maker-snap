const { MakerBase } = require('@electron-forge/maker-base')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

class MakerSnap extends MakerBase {
  name = 'snap'

  defaultPlatforms = ['linux']

  requiredExternalBinaries = ['snapcraft', 'lxd']

  isSupportedOnCurrentPlatform() {
    return process.platform === 'linux'
  }

  async make({ dir, appName, packageJSON, targetArch }) {
    if (!this.config.snapcraftYamlPath) {
      throw new Error(
        `MakerSnap: snapcraftYamlPath needs to be defined: ${this.config.snapcraftYamlPath}`
      )
    }
    const { snapcraftYamlPath } = this.config

    if (!this.config.summary) {
      throw new Error(`MakerSnap: summary needs to be defined: ${this.config.summary}`)
    }

    if (!this.config.description) {
      throw new Error(`MakerSnap: description needs to be defined: ${this.config.description}`)
    }

    if (!fs.existsSync(snapcraftYamlPath)) {
      throw new Error(`MakerSnap: snapcraft.yaml not found at ${snapcraftYamlPath}`)
    }

    // Map electron arch to snap arch
    const snapArch = { x64: 'amd64', arm64: 'arm64', armv7l: 'armhf' }[targetArch] || targetArch

    const snapName = (packageJSON.name || appName).toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const { version } = packageJSON

    // Copy snapcraft.yaml into build dir
    const buildDir = path.dirname(dir)
    const snapDir = path.join(buildDir, 'snap')
    fs.rmSync(snapDir, { recursive: true, force: true })
    fs.mkdirSync(snapDir)

    // Copy snapcraft.yaml into build dir
    const snapcraftYamlSource = fs
      .readFileSync(snapcraftYamlPath, 'utf8')
      .replace('__VERSION__', `'${version}'`)
      .replace('__SUMMARY__', this.config.summary)
      .replace('__DESCRIPTION__', this.config.description)
      .replace('__SOURCE__', path.relative(buildDir, dir))
    fs.writeFileSync(path.join(snapDir, 'snapcraft.yaml'), snapcraftYamlSource)

    const outputFile = path.join(snapDir, `${snapName}_${version}_${snapArch}.snap`)

    // Run snapcraft
    execSync(`sudo -u $USER -E snapcraft pack --output ${snapDir}`, {
      cwd: buildDir,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env
      }
    })

    return [outputFile]
  }
}

module.exports = MakerSnap
