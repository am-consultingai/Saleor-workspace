# Saleor-workspace

A workspace overlay around the Saleor polyrepo. See `CLAUDE.md` for the cross-repo
overview. The child repos (`saleor`, `saleor-dashboard`, `storefront`,
`saleor-platform`) are git-ignored here and each lives as its own repo.

## Set up on a new machine
```bash
gh repo clone <your-user>/Saleor-workspace
cd Saleor-workspace
./clone-all.sh          # CLONE_DEPTH=0 ./clone-all.sh for full history
```
