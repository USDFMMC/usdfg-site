# 📋 Deployment Checklist

## ✅ Pre-Deployment (All Done!)

- [x] Anchor project structure created
- [x] Program keypair generated (7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY)
- [x] Smart contract updated with new program ID
- [x] Frontend config.ts updated
- [x] Frontend contract.ts updated (oracle calls removed)
- [x] IDL metadata updated
- [x] Deployment script created
- [x] Documentation created

## ⏳ Deployment Steps (You Need to Do These)

### Step 1: Deploy Smart Contract
```bash
./deploy-contract.sh
```
- [ ] Script runs successfully
- [ ] Build completes without errors
- [ ] Deployment succeeds
- [ ] Program ID confirmed: 7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY

### Step 2: Update Frontend IDL
```bash
cp target/idl/usdfg_smart_contract.json client/src/lib/chain/
```
- [ ] IDL file copied

### Step 3: Rebuild Frontend
```bash
cd client
npm run build
```
- [ ] Build completes without errors
- [ ] dist/ folder generated

### Step 4: Test Locally (Optional but Recommended)
```bash
cd client
npm run dev
```
- [ ] Site loads correctly
- [ ] Wallet connects
- [ ] Try creating a challenge
- [ ] No oracle errors in console
- [ ] Transaction succeeds

### Step 5: Deploy Frontend to Production
Upload `dist/` folder to your hosting platform
- [ ] Files uploaded
- [ ] Site is live
- [ ] Test challenge creation on production

### Step 6: Verify Everything Works
- [ ] Go to https://usdfg.pro
- [ ] Connect wallet
- [ ] Create a challenge
- [ ] Check console - should see:
  - ✅ "Creating instruction with NEW smart contract (oracle-free)"
  - ✅ "Instruction created"
  - ✅ "Transaction confirmed"
  - ❌ NO "InstructionFallbackNotFound" errors

## 🎉 Post-Deployment

- [ ] Test challenge creation
- [ ] Test challenge acceptance
- [ ] Test challenge resolution
- [ ] Verify escrow works correctly
- [ ] Monitor for any errors

## 🆘 If Something Goes Wrong

### Deployment Failed?
Check:
- [ ] Solana CLI installed?
- [ ] Anchor CLI installed?
- [ ] Enough SOL in wallet? (need ~2 SOL)
- [ ] On devnet? (`solana config get`)

### Frontend Build Failed?
Check:
- [ ] All dependencies installed? (`npm install`)
- [ ] IDL file copied?
- [ ] TypeScript errors? (check terminal output)

### Challenge Creation Still Fails?
Check:
- [ ] Using correct program ID in config.ts?
- [ ] IDL file updated?
- [ ] Frontend rebuilt and redeployed?
- [ ] Wallet has USDFG tokens?
- [ ] Network tab in browser dev tools for actual error

## 📞 Quick Reference

| Item | Value |
|------|-------|
| **New Program ID** | `7FcxBoY7313QbsyN9oqGvpJBLGw9B984W18RgZgHPpaY` |
| **Old Program ID** | `2KL4BKvUtDmABvuvRopkCEb33myWM1W9BGodAZ82RWDT` |
| **Admin Wallet** | `3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd` |
| **USDFG Token Mint** | `7iGZRCHmVTFt9kRn5bc9C2cvDGVp2ZdDYUQsiRfDuspX` |
| **Network** | Devnet |

## 📚 Documentation

- **Quick Start**: `README_DEPLOYMENT.md`
- **Detailed Guide**: `DEPLOY_SMART_CONTRACT.md`
- **Status Report**: `DEPLOYMENT_STATUS.md`
- **This Checklist**: `DEPLOYMENT_CHECKLIST.md`

---

**Current Status**: ⏳ Ready to Deploy

**Next Action**: Run `./deploy-contract.sh`

