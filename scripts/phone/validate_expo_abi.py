#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
"""Check packaged Expo JSI imports against actual bundled exports before distribution."""
import re
import subprocess
import sys
from pathlib import Path

def symbols(binary, defined):
    result=subprocess.check_output(['nm','-arch','arm64', '-gU' if defined else '-u',str(binary)],text=True)
    return set(re.findall(r'(_\$s14ExpoModulesJSI[^\s]+)',result))

def validate(app):
    frameworks=Path(app)/'Frameworks'
    binaries=[path/path.stem for path in frameworks.glob('*.framework') if (path/path.stem).is_file()]
    required=set().union(*(symbols(path,False) for path in binaries)) if binaries else set()
    if not required:
        print('PASS: no dynamic ExpoModulesJSI imports to resolve');return
    library=frameworks/'ExpoModulesJSI.framework/ExpoModulesJSI'
    if not library.exists():raise RuntimeError('Missing ExpoModulesJSI runtime framework')
    missing=required-symbols(library,True)
    if missing:raise RuntimeError('Incompatible ExpoModulesJSI imports: '+', '.join(sorted(missing)))
    print('PASS: bundled ExpoModulesJSI exports resolve all module imports')
if __name__=='__main__':validate(sys.argv[1])
