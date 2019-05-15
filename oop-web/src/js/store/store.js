import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import autocompleteReducer from '../reducers/autocomplete';
import relationshipsReducer from '../reducers/relationships';
import searchReducer from '../reducers/search';
import statsReducer from '../reducers/stats';
import taggerReducer from '../reducers/tagger';
import termsReducer from '../reducers/terms';
import fields from '../reducers/fields';
import options from '../reducers/options';
import thunk from 'redux-thunk';

// Create a collection of all reducers
const reducer = combineReducers({
  autocompleteReducer,
  relationshipsReducer,
  searchReducer,
  statsReducer,
  taggerReducer,
  termsReducer,
  fields,
  options,
});

// composeEnhancers will wrap the applyMiddleware function to make Redux Dev Tools available in Chrome
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Create the store, apply the enhancers and middleware, and surface them up to the app
const store = createStore(
  reducer,
  composeEnhancers(
    compose(
      applyMiddleware(thunk)
    )
  )
);

export default store;
