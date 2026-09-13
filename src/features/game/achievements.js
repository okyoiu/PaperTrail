// The tasks a player can complete, each celebrated once with a toast (see
// hooks/useAchievements.js and AchievementToast.jsx). There's no achievements
// table, so progress is worked out from data the app already has: the player's
// reviews and their accepted friends.
export const ACHIEVEMENTS = [
  {
    id: 'star-player',
    icon: '/icons/stars-achiev.svg',
    title: 'star player',
    description: 'leave your first review!',
    earned: (stats) => stats.reviews >= 1,
  },
  {
    id: 'first-friend',
    icon: '/icons/heart-achiev.svg',
    title: 'u + me = <3',
    description: 'add first friend!',
    earned: (stats) => stats.friends >= 1,
  },
  {
    id: 'photogenic',
    icon: '/icons/camera-achiev.svg',
    title: 'photogenic',
    description: 'add 3 pictures!',
    earned: (stats) => stats.photos >= 3,
  },
]

// reviews: from api.getMyReviews; friends: from api.getFriends.
export function achievementStats({ reviews, friends }) {
  return {
    reviews: reviews.length,
    photos: reviews.filter((review) => review.photo_url).length,
    friends: friends.length,
  }
}
