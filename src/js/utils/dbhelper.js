import idb from 'idb';

/**
 * Common database helper functions.
 */
export default class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Handle fetch errors
   * 
   * https://www.tjvantoll.com/2015/09/13/fetch-and-errors/
   * 
   * @param {Prommise} response 
   */
  static getData(response) {
    if (!response.ok) {
      throw Error(response.status.text);
    }
    return response.json();
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    // check idb for restaurants
    this.idbGetRestaurants()
      .then(restaurants => {
        if (restaurants && restaurants.length > 0) {
          callback(null, restaurants);
        } else {
          // fetch restaurants
          fetch(DBHelper.DATABASE_URL)
            .then(DBHelper.getData)
            .then(restaurants => {
              this.idbSetRestaurants(restaurants);
              callback(null, restaurants);
            })
            .catch(error => {
              callback(error, null);
            });
        }
      })
      .catch(error => {
        console.log(error);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch restaurant
    fetch(`http://localhost:1337/restaurants?id=${id}`)
      .then(DBHelper.getData)
      .then(restaurant => {
        callback(null, restaurant);
      })
      .catch(error => {
        callback(error, null);
      });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // fetch restaurants by cuisine
    let url = DBHelper.DATABASE_URL;
    if (cuisine != 'all') {
      url += `?cuisine_type=${cuisine}`;
    }
    fetch(url)
      .then(DBHelper.getData)
      .then(restaurants => {
        callback(null, restaurants);
      })
      .catch(error => {
        callback(error, null);
      });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // fetch restaurants by neighborhood
    let url = DBHelper.DATABASE_URL;
    if (neighborhood != 'all') {
      url += `?neighborhood=${neighborhood}`;
    }
    fetch(url)
      .then(DBHelper.getData)
      .then(restaurants => {
        callback(null, restaurants);
      })
      .catch(error => {
        callback(error, null);
      });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // fetch restaurants by cuisine and neighborhood
    let url = DBHelper.DATABASE_URL;
    url += '?';

    // Add filter only if it is different from default
    if (cuisine != 'all') {
      url += `cuisine_type=${cuisine}`;
    }
    
    if (neighborhood != 'all') {
      if (cuisine != 'all') {
        url += '&';
      }
      url += `neighborhood=${neighborhood}`;
    }

    fetch(url)
      .then(DBHelper.getData)
      .then(restaurants => {
        callback(null, restaurants);
      })
      .catch(error => {
        callback(error, null);
      });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    let img = restaurant.photograph || restaurant.id;
    return (`/img/${img}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(google, restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  static idbGetDB() {
    return idb.open('restaurants-review', 1, function(upgradeDB) {
      upgradeDB.createObjectStore('restaurants', {
        keyPath: 'id'
      });
    });
  }

  static idbGetRestaurants() {
    return this.idbGetDB().then(function(db) {
      var tx = db.transaction(['restaurants'], 'readonly');
      var store = tx.objectStore('restaurants');
      return store.getAll();
    });
  }

  static idbSetRestaurants(restaurants) {
    return DBHelper.idbGetDB().then(function(db) {
      var tx = db.transaction(['restaurants'], 'readwrite');
      var store = tx.objectStore('restaurants');
      return Promise.all(restaurants.map(function(restaurant) {
        return store.add(restaurant);
      })
      ).catch(function(e) {
        tx.abort();
        console.log(e);
      });
    });
  }

}

/** Databse Service
 * 
 * Helper class to handle database operations
 */
export class DBService {

  constructor() {
    this.db = this.idbGetDB();
  }

  idbGetDB() {
    return idb.open('restaurant-reviews', 2, upgradeDB => {
      // Note: we don't use 'break' in this switch statement,
      // the fall-through behaviour is what we want.
      switch (upgradeDB.oldVersion) {
        case 0:
          upgradeDB.createObjectStore('restaurants', {
            keyPath: 'id'
          });
          // eslint-disable-line no-fallthrough
        case 1: {
          const reviews = upgradeDB.createObjectStore('reviews', {
            keyPath: 'id'
          });
          reviews.createIndex('restaurant', 'restaurant_id', {unique: false});
        }
      }
    });   
  }

  /**
   * Handle fetch errors
   * 
   * If there is an error, throws an error, otherwise
   * returns response.
   * 
   * https://www.tjvantoll.com/2015/09/13/fetch-and-errors/
   * 
   * @param {Prommise} response 
   */
  handleFetchError(response) {
    if (!response.ok) {
      throw Error(response.status.text);
    }
    return response;
  }

  /**
   * Get reviews for the restaurant from IndexedDB
   * 
   * @param {String} id 
   */
  idbGetReviews(id) {
    return this.db.then(function(db) {
      let tx = db.transaction(['reviews'], 'readonly');
      let store = tx.objectStore('reviews');
      let index = store.index('restaurant');
      return index.getAll(IDBKeyRange.only(id));
    });
  }

  /**
   * Store reviews into IndexedDB
   * 
   * @param {Object[]} reviews - The reviews to be stored.
   */
  idbPostReviews(reviews) {
    return this.idbPostRecords('reviews', reviews);
  }

  /**
   * Store records into IndexedDB
   * 
   * @param {string} objectStoreName - The name of the object store.
   * @param {Object[]} records - The records to be stored. 
   */
  idbPostRecords(objectStoreName, records) {
    return this.db
      .then(db => {
        var tx = db.transaction([objectStoreName], 'readwrite');
        var store = tx.objectStore(objectStoreName);
        return Promise.all(records.map(record => {
          return store.add(record);
        })
        ).catch(function(e) {
          tx.abort();
          console.log(e);
        });
      })
      // return records Promise
      .then(() => records);
  }

  /**
   * Gets reviews for the restaurant
   * 
   * @param {String} id 
   */
  getReviews(id) {
    return this.idbGetReviews(id)
      .then(reviews => {
        if (reviews && reviews.length > 0) {
          return reviews;
        } else {
          return this.remoteGetReviews(id)
            .then(reviews => this.idbPostReviews(reviews));
        }
      });
  }

  /**
   * Fetch reviews for the restaurant from a remote server
   * 
   * @param {String} id 
   */
  remoteGetReviews(id) {
    return fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
      .then(response => this.handleFetchError(response))
      .then(response => response.json());
  }
}