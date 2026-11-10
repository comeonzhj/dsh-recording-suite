#!/usr/bin/env bash
# 用法：check-watch-profile.sh <DSHRecordingPhone.app> [Watch UDID] [watchOS 版本]
# 依赖 macOS 的 security、codesign、xcrun 和 Python 3。
set -euo pipefail
python3 - "$@" <<'PY'
import datetime
import fnmatch
import plistlib
from pathlib import Path
import subprocess
import sys

if len(sys.argv) not in (2, 3, 4):
    sys.exit('usage: check-watch-profile.sh <DSHRecordingPhone.app> [Watch UDID] [watchOS version]')
phone = Path(sys.argv[1])
watch = phone / 'Watch/DSHRecordingWatch.app'
udid = sys.argv[2] if len(sys.argv) > 2 else None
os_version = sys.argv[3] if len(sys.argv) > 3 else None
errors = []
teams = set()

def run(*args):
    return subprocess.check_output(args, stderr=subprocess.PIPE)

def version(value):
    parts = [int(x) for x in value.split('.')]
    return tuple((parts + [0, 0, 0])[:3])

try:
    phone_info = plistlib.loads((phone / 'Info.plist').read_bytes())
    apps = [watch, *sorted((watch / 'PlugIns').glob('*.appex'))]
    if not apps[1:]:
        errors.append('缺少 Watch Widget 扩展')
    for app in apps:
        print(f'检查 {app.name}', flush=True)
        try:
            info = plistlib.loads((app / 'Info.plist').read_bytes())
            minimum = info.get('MinimumOSVersion', '')
            print(f'  platform={info.get("DTPlatformName")} minimumOS={minimum}')
            if info.get('DTPlatformName') != 'watchos' or info.get('UIDeviceFamily') != [4]:
                errors.append(f'{app.name}: 平台或设备族错误，需要 watchos / [4]')
            if os_version and version(minimum) > version(os_version):
                errors.append(f'{app.name}: 最低系统 {minimum} 高于手表 {os_version}')
            binary = run('xcrun', 'vtool', '-show-build', str(app / info['CFBundleExecutable'])).decode()
            if 'platform WATCHOS\n' not in binary:
                errors.append(f'{app.name}: Mach-O 平台缺少 WATCHOS')
            if app == watch and (not info.get('WKApplication') or info.get('WKCompanionAppBundleIdentifier') != phone_info['CFBundleIdentifier']):
                errors.append('Watch App 的 WKApplication 或伴侣 Bundle ID 配置错误')
            run('codesign', '--verify', '--strict', str(app))
            profile = plistlib.loads(run('security', 'cms', '-D', '-i', str(app / 'embedded.mobileprovision')))
            print(f'  profile={profile.get("Name")} platforms={profile.get("Platform")} devices={len(profile.get("ProvisionedDevices", []))}')
            # Apple 将 iOS App Development 用于 iOS 和 watchOS；Platform 字段不能单独判错。
            if not set(profile.get('Platform', [])) & {'iOS', 'watchOS'}:
                errors.append(f'{app.name}: profile 平台不受支持')
            expiry = profile.get('ExpirationDate')
            if not expiry or expiry.replace(tzinfo=datetime.timezone.utc) <= datetime.datetime.now(datetime.timezone.utc):
                errors.append(f'{app.name}: profile 已过期或缺少有效期')
            entitlements = plistlib.loads(run('codesign', '-d', '--entitlements', ':-', str(app)))
            app_id = entitlements.get('application-identifier', '')
            allowed_id = profile.get('Entitlements', {}).get('application-identifier', '')
            if not app_id or not allowed_id or not fnmatch.fnmatchcase(app_id, allowed_id) or not app_id.endswith('.' + info['CFBundleIdentifier']):
                errors.append(f'{app.name}: 签名 application-identifier 与 profile / Bundle ID 不匹配')
            team = entitlements.get('com.apple.developer.team-identifier')
            teams.add(team)
            if not team or team not in profile.get('TeamIdentifier', []):
                errors.append(f'{app.name}: 签名团队与 profile 不匹配')
            if udid and not profile.get('ProvisionsAllDevices') and udid not in profile.get('ProvisionedDevices', []):
                errors.append(f'{app.name}: profile 未包含这块手表的 UDID')
        except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
            errors.append(f'{app.name}: {error}')
    if len(teams) > 1:
        errors.append('Watch App 与 Widget 的签名团队不一致')
    run('codesign', '--verify', '--deep', '--strict', str(phone))
except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
    errors.append(str(error))
for error in errors:
    print(f'失败：{error}', file=sys.stderr)
if not udid:
    print('待确认：未提供 Watch UDID，尚未核对手表是否在两个 profile 的设备列表中。')
if not os_version:
    print('待确认：未提供 watchOS 版本，尚未核对最低系统要求。')
if errors:
    sys.exit(1)
print('已提供参数范围内的静态检查通过；实际安装仍需设备安装日志确认。')
PY
