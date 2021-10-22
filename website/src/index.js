import React from "react";
import ReactDOM from "react-dom";

import AppRoutes from './js/routes/Routes'

import './scss/main.css';

// Redux implementation
import { Provider } from 'react-redux';
import store from './js/store/store';

ReactDOM.render(
  <Provider store={store}>
    <AppRoutes />
  </Provider>,
  document.getElementById("root")
);
