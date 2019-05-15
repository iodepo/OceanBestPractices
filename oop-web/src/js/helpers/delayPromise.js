export default function delayPromise(delay) {

  // Return a function that accepts a single variable

  return function(data) {

    // This function returns a promise.

    return new Promise(function(resolve, reject) {
      setTimeout(function() {

        // A promise that is resolved after "delay" milliseconds with the data provided

        resolve(data);
      }, delay);
    });
  }
}
