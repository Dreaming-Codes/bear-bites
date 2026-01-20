import {
  getLocations,
  getMenu,
  getMenusForWeek,
  getFoodDetail,
  searchMenuItems,
  getFilteredMenu,
  getDateBounds,
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
