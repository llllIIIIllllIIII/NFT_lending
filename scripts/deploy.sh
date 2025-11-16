#!/bin/bash

# Load environment variables
source .env

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deploying to IOTA EVM Testnet${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env file${NC}"
    exit 1
fi

# Validate private key format (should be 64 hex characters)
if ! [[ "$PRIVATE_KEY" =~ ^[0-9a-fA-F]{64}$ ]]; then
    echo -e "${RED}Error: PRIVATE_KEY must be 64 hexadecimal characters (without 0x prefix)${NC}"
    echo -e "${RED}Current value: ${PRIVATE_KEY:0:20}...${NC}"
    echo -e "${BLUE}ℹ️  You need an Ethereum-compatible private key for IOTA EVM Testnet${NC}"
    echo -e "${BLUE}   Export it from MetaMask: Settings → Security & Privacy → Show Private Key${NC}"
    exit 1
fi

# Get deployer address
DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY 2>/dev/null)
echo -e "${GREEN}Deployer Address: ${DEPLOYER}${NC}"

# Check balance
BALANCE=$(cast balance $DEPLOYER --rpc-url $IOTA_RPC_URL)
echo -e "${GREEN}Balance: ${BALANCE} wei${NC}"

# Check if balance is sufficient
if [ "$BALANCE" = "0" ]; then
    echo -e "${RED}Error: Insufficient balance. Please get test tokens from:${NC}"
    echo -e "${BLUE}https://evm-toolkit.evm.testnet.iotaledger.net/${NC}"
    echo -e "${BLUE}Your address: ${DEPLOYER}${NC}"
    exit 1
fi
echo ""

# Deploy TestERC20
echo -e "${BLUE}[1/3] Deploying TestERC20...${NC}"
TEST_ERC20_RESULT=$(forge create src/TestERC20.sol:TestERC20 \
    --rpc-url $IOTA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --broadcast \
    --constructor-args "Test USDC" "TUSDC" $DEPLOYER 2>&1)

TEST_ERC20_ADDRESS=$(echo "$TEST_ERC20_RESULT" | grep "Deployed to:" | grep -oE '0x[a-fA-F0-9]{40}')

if [ -n "$TEST_ERC20_ADDRESS" ] && [[ "$TEST_ERC20_ADDRESS" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo -e "${GREEN}✓ TestERC20 deployed at: ${TEST_ERC20_ADDRESS}${NC}"
else
    echo -e "${RED}✗ TestERC20 deployment failed${NC}"
    echo "$TEST_ERC20_RESULT"
    exit 1
fi
echo ""

# Deploy TestERC721
echo -e "${BLUE}[2/3] Deploying TestERC721...${NC}"
TEST_ERC721_RESULT=$(forge create src/TestERC721.sol:TestERC721 \
    --rpc-url $IOTA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --broadcast \
    --constructor-args "Test NFT Collection" "TNFT" $DEPLOYER 2>&1)

TEST_ERC721_ADDRESS=$(echo "$TEST_ERC721_RESULT" | grep "Deployed to:" | grep -oE '0x[a-fA-F0-9]{40}')

if [ -n "$TEST_ERC721_ADDRESS" ] && [[ "$TEST_ERC721_ADDRESS" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo -e "${GREEN}✓ TestERC721 deployed at: ${TEST_ERC721_ADDRESS}${NC}"
else
    echo -e "${RED}✗ TestERC721 deployment failed${NC}"
    echo "$TEST_ERC721_RESULT"
    exit 1
fi
echo ""

# Deploy NFTLending
echo -e "${BLUE}[3/3] Deploying NFTLending...${NC}"
NFT_LENDING_RESULT=$(forge create src/NFTLending.sol:NFTLending \
    --rpc-url $IOTA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --broadcast 2>&1)

NFT_LENDING_ADDRESS=$(echo "$NFT_LENDING_RESULT" | grep "Deployed to:" | grep -oE '0x[a-fA-F0-9]{40}')

if [ -n "$NFT_LENDING_ADDRESS" ] && [[ "$NFT_LENDING_ADDRESS" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo -e "${GREEN}✓ NFTLending deployed at: ${NFT_LENDING_ADDRESS}${NC}"
else
    echo -e "${RED}✗ NFTLending deployment failed${NC}"
    echo "$NFT_LENDING_RESULT"
    exit 1
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}TestERC20 (TUSDC):  ${TEST_ERC20_ADDRESS}${NC}"
echo -e "${GREEN}TestERC721 (TNFT):  ${TEST_ERC721_ADDRESS}${NC}"
echo -e "${GREEN}NFTLending:         ${NFT_LENDING_ADDRESS}${NC}"
echo ""

# Update .env file
echo -e "${BLUE}Updating .env file...${NC}"
sed -i '' "s|^TEST_ERC20_ADDRESS=.*|TEST_ERC20_ADDRESS=${TEST_ERC20_ADDRESS}|" .env
sed -i '' "s|^TEST_ERC721_ADDRESS=.*|TEST_ERC721_ADDRESS=${TEST_ERC721_ADDRESS}|" .env
sed -i '' "s|^NFT_LENDING_ADDRESS=.*|NFT_LENDING_ADDRESS=${NFT_LENDING_ADDRESS}|" .env
sed -i '' "s|^NEXT_PUBLIC_TEST_ERC20_ADDRESS=.*|NEXT_PUBLIC_TEST_ERC20_ADDRESS=${TEST_ERC20_ADDRESS}|" .env
sed -i '' "s|^NEXT_PUBLIC_TEST_ERC721_ADDRESS=.*|NEXT_PUBLIC_TEST_ERC721_ADDRESS=${TEST_ERC721_ADDRESS}|" .env
sed -i '' "s|^NEXT_PUBLIC_NFT_LENDING_ADDRESS=.*|NEXT_PUBLIC_NFT_LENDING_ADDRESS=${NFT_LENDING_ADDRESS}|" .env

# Update frontend .env.local
if [ -f "frontend/.env.local" ]; then
    echo -e "${BLUE}Updating frontend/.env.local...${NC}"
    sed -i '' "s|^NEXT_PUBLIC_TEST_ERC20_ADDRESS=.*|NEXT_PUBLIC_TEST_ERC20_ADDRESS=${TEST_ERC20_ADDRESS}|" frontend/.env.local
    sed -i '' "s|^NEXT_PUBLIC_TEST_ERC721_ADDRESS=.*|NEXT_PUBLIC_TEST_ERC721_ADDRESS=${TEST_ERC721_ADDRESS}|" frontend/.env.local
    sed -i '' "s|^NEXT_PUBLIC_NFT_LENDING_ADDRESS=.*|NEXT_PUBLIC_NFT_LENDING_ADDRESS=${NFT_LENDING_ADDRESS}|" frontend/.env.local
fi

echo -e "${GREEN}✓ Environment files updated${NC}"
echo ""

# Block Explorer Links
echo -e "${BLUE}View on IOTA EVM Explorer:${NC}"
echo -e "TestERC20:  https://explorer.evm.testnet.iotaledger.net/address/${TEST_ERC20_ADDRESS}"
echo -e "TestERC721: https://explorer.evm.testnet.iotaledger.net/address/${TEST_ERC721_ADDRESS}"
echo -e "NFTLending: https://explorer.evm.testnet.iotaledger.net/address/${NFT_LENDING_ADDRESS}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
