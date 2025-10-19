#!/bin/bash

# iTerm2 Title Configuration Script
# This script helps configure iTerm2 to accept title changes

echo "🔧 Configuring iTerm2 for title changes..."

# Method 1: Set TERM environment variable
echo "Setting TERM to xterm-256color..."
export TERM=xterm-256color

# Method 2: Add to shell profile
SHELL_PROFILE=""
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_PROFILE="$HOME/.bash_profile"
fi

if [[ -n "$SHELL_PROFILE" ]]; then
    echo "Adding TERM configuration to $SHELL_PROFILE..."
    
    # Check if TERM is already set
    if ! grep -q "export TERM=xterm-256color" "$SHELL_PROFILE" 2>/dev/null; then
        echo "" >> "$SHELL_PROFILE"
        echo "# iTerm2 title support" >> "$SHELL_PROFILE"
        echo "export TERM=xterm-256color" >> "$SHELL_PROFILE"
        echo "✅ Added TERM configuration to $SHELL_PROFILE"
    else
        echo "✅ TERM configuration already exists in $SHELL_PROFILE"
    fi
fi

# Method 3: Test title setting
echo "Testing title setting..."
printf "\033]0;Test Title - iTerm2 Configuration\a"

echo ""
echo "🎯 Manual iTerm2 Configuration Required:"
echo "1. Open iTerm2 Preferences (Cmd + ,)"
echo "2. Go to Profiles > [Your Profile] > Terminal"
echo "3. Check 'Terminal may set tab/window title'"
echo "4. Set Terminal type to 'xterm-256color'"
echo "5. Restart iTerm2"
echo ""
echo "After configuration, test with:"
echo "printf \"\\033]0;Your Title Here\\a\""