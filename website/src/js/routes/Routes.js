import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Provider } from 'react-redux';
import withTracker from '../components/Tracker';

// Redux Store
import store from '../store/store';

// Layouts
import Main from '../layouts/Main';
import Search from '../layouts/Search';
import Tagger from '../layouts/Tagger';

const Component = (component) => {
  return withTracker(component);
}

export default () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Switch>
          <Route exact path="/" component={Component(Main)} />
          <Route exact path="/search" component={Component(Search)} />
          <Route exact path="/tagger" component={Component(Tagger)} />
        </Switch>
      </BrowserRouter>
    </Provider>
  )
}
