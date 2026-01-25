import {
  getDateBounds,
  getFilteredMenu,
  getFoodDetail,
  getLocations,
  getMenu,
  getMenusForWeek,
  searchMenuItems,
} from './menu'
import {
  addFavorite,
  getFavorites,
  isFavorite,
  removeFavorite,
  syncFavorites,
} from './favorites'

export default {
  menu: {
    getLocations,
    getMenu,
    getMenusForWeek,
    getFoodDetail,
    searchMenuItems,
    getFilteredMenu,
    getDateBounds,
  },

  favorites: {
    getFavorites,
    addFavorite,
    removeFavorite,
    syncFavorites,
    isFavorite,
  },
}
