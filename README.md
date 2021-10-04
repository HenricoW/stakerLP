# ERC20 Staking dApp

A staking application for ETB hackathon #2

- Admin funds contract with the reward token, sets rewards duration & checkpoint length
- Each user has a check point record
- User checkpoints feed into global check point record
- Claim function iterates over check points to calculate reward
- Check point where last claim was made, is stored in user record (to not iterate from start again)
- The front end also shows the estimated claimable amount
