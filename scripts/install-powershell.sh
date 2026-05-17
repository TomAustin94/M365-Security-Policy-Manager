#!/usr/bin/env bash
set -euo pipefail

echo "=== PowerShell Core Installer ==="

# Detect distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
else
    DISTRO="unknown"
fi

echo "Detected distribution: $DISTRO"

install_debian() {
    echo "Installing PowerShell via apt (Debian/Ubuntu)..."
    sudo apt-get update
    sudo apt-get install -y curl apt-transport-https software-properties-common
    curl -sSL https://packages.microsoft.com/keys/microsoft.asc | sudo tee /etc/apt/trusted.gpg.d/microsoft.asc > /dev/null
    source /etc/os-release
    echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-${ID}-${VERSION_CODENAME}-prod ${VERSION_CODENAME} main" | sudo tee /etc/apt/sources.list.d/microsoft.list
    sudo apt-get update
    sudo apt-get install -y powershell
}

install_rhel() {
    echo "Installing PowerShell via dnf/yum (RHEL/CentOS/Fedora)..."
    if command -v dnf &>/dev/null; then
        sudo dnf install -y https://packages.microsoft.com/rhel/7/prod/packages-microsoft-prod.rpm
        sudo dnf install -y powershell
    else
        sudo yum install -y https://packages.microsoft.com/rhel/7/prod/packages-microsoft-prod.rpm
        sudo yum install -y powershell
    fi
}

install_generic() {
    echo "Installing PowerShell via binary tarball..."
    PWSH_VERSION=$(curl -s https://api.github.com/repos/PowerShell/PowerShell/releases/latest | grep '"tag_name"' | cut -d'"' -f4 | tr -d 'v')
    PWSH_URL="https://github.com/PowerShell/PowerShell/releases/download/v${PWSH_VERSION}/powershell-${PWSH_VERSION}-linux-x64.tar.gz"

    mkdir -p ~/.local/bin/powershell
    curl -sSL "$PWSH_URL" -o /tmp/powershell.tar.gz
    tar -xzf /tmp/powershell.tar.gz -C ~/.local/bin/powershell
    chmod +x ~/.local/bin/powershell/pwsh
    ln -sf ~/.local/bin/powershell/pwsh ~/.local/bin/pwsh
    rm /tmp/powershell.tar.gz

    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        export PATH="$HOME/.local/bin:$PATH"
    fi
}

case "$DISTRO" in
    ubuntu|debian|linuxmint|pop)
        install_debian
        ;;
    rhel|centos|fedora|rocky|almalinux)
        install_rhel
        ;;
    *)
        install_generic
        ;;
esac

echo "Verifying installation..."
if command -v pwsh &>/dev/null; then
    pwsh --version
    echo "=== PowerShell installed successfully ==="
else
    echo "ERROR: pwsh not found in PATH after installation" >&2
    exit 1
fi
