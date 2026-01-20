import {
  getLocations,
  getMenu,
  getMenusForWeek,
  getFoodDetail,
  searchMenuItems,
  getFilteredMenu,
} from './menu'
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  syncFavorites,
  isFavorite,
} from './favorites'

export default {
    menu: {
    getLocations,
    getMenu,
    getMenusForWeek,
    getFoodDetail,
    searchMenuItems,
    getFilteredMenu,
  },

  favorites: {
    getFavorites,
    addFavorite,
    removeFavorite,
    syncFavorites,
    isFavorite,
  },
}
