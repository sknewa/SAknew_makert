#!/usr/bin/env python3
"""
Script to automatically fix log injection vulnerabilities in TypeScript files
by replacing console.log with safeLog from securityUtils
"""

import os
import re
from pathlib import Path

# Directories to process
FRONTEND_DIR = Path("saknew_frontend")
DIRS_TO_PROCESS = [
    FRONTEND_DIR / "services",
    FRONTEND_DIR / "screens",
    FRONTEND_DIR / "components",
    FRONTEND_DIR / "utils",
    FRONTEND_DIR / "context"
]

def has_console_log(content):
    """Check if file contains console.log, console.error, or console.warn"""
    return bool(re.search(r'console\.(log|error|warn)\(', content))

def already_has_safe_import(content):
    """Check if file already imports from securityUtils"""
    return 'securityUtils' in content

def add_safe_import(content):
    """Add import for safeLog, safeError, safeWarn"""
    # Find the last import statement
    import_pattern = r"^import .+ from .+;$"
    imports = list(re.finditer(import_pattern, content, re.MULTILINE))
    
    if imports:
        last_import = imports[-1]
        insert_pos = last_import.end()
        new_import = "\nimport { safeLog, safeError, safeWarn } from '../utils/securityUtils';"
        
        # Adjust path based on file location
        file_depth = content.count('../')
        if 'services/' in str(content):
            new_import = "\nimport { safeLog, safeError, safeWarn } from '../utils/securityUtils';"
        elif 'screens/' in str(content):
            new_import = "\nimport { safeLog, safeError, safeWarn } from '../../utils/securityUtils';"
        elif 'components/' in str(content):
            new_import = "\nimport { safeLog, safeError, safeWarn } from '../utils/securityUtils';"
        
        return content[:insert_pos] + new_import + content[insert_pos:]
    return content

def replace_console_calls(content):
    """Replace console.log/error/warn with safe versions"""
    content = re.sub(r'\bconsole\.log\(', 'safeLog(', content)
    content = re.sub(r'\bconsole\.error\(', 'safeError(', content)
    content = re.sub(r'\bconsole\.warn\(', 'safeWarn(', content)
    return content

def process_file(file_path):
    """Process a single TypeScript file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if not has_console_log(content):
            return False
        
        original_content = content
        
        # Add import if needed
        if not already_has_safe_import(content):
            # Determine correct import path based on file location
            rel_path = file_path.relative_to(FRONTEND_DIR)
            depth = len(rel_path.parts) - 1
            import_path = '../' * depth + 'utils/securityUtils'
            
            # Find last import
            import_lines = [i for i, line in enumerate(content.split('\n')) if line.startswith('import ')]
            if import_lines:
                lines = content.split('\n')
                last_import_idx = import_lines[-1]
                lines.insert(last_import_idx + 1, f"import {{ safeLog, safeError, safeWarn }} from '{import_path}';")
                content = '\n'.join(lines)
        
        # Replace console calls
        content = replace_console_calls(content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to process all files"""
    files_processed = 0
    files_modified = 0
    
    for dir_path in DIRS_TO_PROCESS:
        if not dir_path.exists():
            print(f"Directory not found: {dir_path}")
            continue
        
        for file_path in dir_path.rglob('*.ts*'):
            if file_path.suffix in ['.ts', '.tsx']:
                files_processed += 1
                if process_file(file_path):
                    files_modified += 1
                    print(f"[OK] Modified: {file_path.relative_to(FRONTEND_DIR)}")
    
    print(f"\n{'-'*60}")
    print(f"Files processed: {files_processed}")
    print(f"Files modified: {files_modified}")
    print(f"{'-'*60}")

if __name__ == '__main__':
    main()
