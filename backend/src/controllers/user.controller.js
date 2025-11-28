export async function getDashboard(req, res) {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      createdAt: req.user.createdAt,
      email: req.user.email
    },
  });
}
