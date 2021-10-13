function getDocumentFromURI(uri, callback) {
  const opts = {
    hostname: obp.host,
    path: obp.findPath,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': obp.userAgent 
    }
  };

  const reqData = JSON.stringify({
    key: "dc.identifier.uri",
    value: uri
  });

  var req = https.request(opts, function(res) {
    var resData = '';

    res.on('data', function(chunk) {
      resData += chunk;
    });

    res.on('end', function() {
      var parsedResData = JSON.parse(resData);
      if (parsedResData.length > 0) {
        callback(null, parsedResData[0]);
      } else {
        callback(null, null);
      } 
    });

    res.on('error', function(err) {
      callback(err, null);
    });
  });

  req.end(reqData);
}
