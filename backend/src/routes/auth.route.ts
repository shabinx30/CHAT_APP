import express from "express"
const router = express.Router()



router.get('/signup', (req, res) => {
    res.send('sign up anne')
})
router.get('/login', (req, res) => {
    res.send('login anne')
})
router.get('/logout', (req, res) => {
    res.send('logout anne')
})

export default router