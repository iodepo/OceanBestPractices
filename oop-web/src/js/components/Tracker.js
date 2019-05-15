import React, { Component } from 'react';
import { connect } from 'react-redux';
import GA from 'react-ga';

import { customDimensionsFromState } from '../helpers/tracker';

const ga_property_id = 'UA-6465061-70';

const DEFAULT_OPTIONS = {
  anonymizeIp: true,
};

GA.initialize(ga_property_id, {
  titleCase: false,
});

/**
 * withTracker
 * @description wraps a component providing page view events on component mount
 * @via https://github.com/react-ga/react-ga/wiki/React-Router-v4-withTracker
 * @docs https://github.com/react-ga/react-ga
 */

const withTracker = (WrappedComponent, options = {}) => {

  class HOC extends Component {

    componentDidMount() {

      const page = pageByLocation(this.props.location);

      this.trackPage(page);

    }

    componentDidUpdate(prevProps) {

      const previous_page = pageByLocation(prevProps.location);
      const current_page = pageByLocation(this.props.location);

      if ( previous_page !== current_page ) {
        this.trackPage(current_page);
      }

    }

    trackPage(page) {

      GA.ga((tracker) => {

        // Grab the custom dimensions and join it with the client ID. We need to do this here
        // as we need access to the tracker object

        const custom_dimensions = this.dimensions({
          dimension1: tracker.get('clientId')
        });

        // Merge all of the default options, custom dimensions, and any instance defined options

        const tracking_options = Object.assign({}, DEFAULT_OPTIONS, custom_dimensions, options);

        tracker.set({
          page,
          ...tracking_options,
        });

        tracker.send('pageview');

      });

    }

    dimensions(dimensions) {
      return Object.assign({}, this.props.custom_dimensions || {}, dimensions || {});
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }

  };

  const mapStateToProps = ( state ) => {

    return {
      custom_dimensions: customDimensionsFromState(state),
    };

  };

  return connect(mapStateToProps)(HOC);

}

export default withTracker;





/**
 * pageByLocation
 * @description Constructs the full page path via the location object;
 */

function pageByLocation(location = {}) {
  return location.pathname + location.search
}