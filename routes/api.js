var express = require("express");
var router = express.Router();


const fetch = require("node-fetch");
const convert = require('convert-units')
const DOMParser = require("xmldom").DOMParser;

const url = "https://service.winsim.de/";
const urlLogin = url + "public/login_check";
const urlDataUsage = url + "mytariff/invoice/showGprsDataUsage";

// create an errorHandler callback that throws an exception
const domParserErrorHandler = function(errorString) {
  // console.log(errorString);
};

// bind our errorHandler to warnings, errors & fatalErrors.
const domParserOptions = {
  errorHandler: {
    warning: domParserErrorHandler,
    error: domParserErrorHandler,
    fatalError: domParserErrorHandler
  },
  locator: {}
};

router.post("/login", function(req, res, next) {
  let errorMsg = {
    message: "",
    status: 0
  };

  const body = req.body;

  if (
    typeof body.username === "undefined" ||
    typeof body.password === "undefined"
  ) {
    errorMsg = {
      message: "Please provide an username and a password",
      status: 400
    };

    res.status(400).json(errorMsg);
  }

  let cookie = {
    sid: "",
    expires: "",
    maxage: 3600
  };

  fetch(url, {
    method: "GET",
    headers: {
      Cookie: "1234",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36",
      Referer: "https://service.winsim.de/",
      Origin: "https://service.winsim.de/"
    }
  })
    .then(response => {
      /* Start Page response */

      if (response.ok === false) {
        errorMsg = {
          message: `The response status is:  ${response.status}`,
          status: 101
        };
        throw errorMsg;
      }

      return response.text();
    })
    .then(body => {
      // Parse page: body
      const parser = new DOMParser(domParserOptions);
      const xmlDoc = parser.parseFromString(body);

      // Get token from html page
      const token = xmlDoc
        .getElementById("UserLoginType__token")
        .getAttribute("value");

      // Get _SID from page
      const inputTags = xmlDoc.getElementsByTagName("input");
      let sid = "";
      for (let index = 0; index < inputTags.length; index++) {
        const element = inputTags.item(index);
        if (
          element.hasAttribute("name") &&
          element.getAttribute("name") == "_SID"
        ) {
          sid = element.getAttribute("value");
        }
      }

      if (token === "") {
        errorMsg = {
          message: `No value for token found at login page`,
          status: 201
        };
        throw errorMsg;
      }
      if (sid === "") {
        errorMsg = {
          message: `No value for _SID found at login page`,
          status: 202
        };
        throw errorMsg;
      }

      return { token, sid };
    })
    .then(obj => {
      /* Request Login */

      console.log(obj);
      const details = {
        "UserLoginType[alias]": body.username,
        "UserLoginType[password]": body.password,
        "UserLoginType[rememberUsername]": "1",
        "UserLoginType[_token]": obj.token,
        "UserLoginType[logindata]": "",
        _SID: obj.sid
      };
      let formBody = [];
      for (let property in details) {
        let encodedKey = encodeURIComponent(property);
        let encodedValue = encodeURIComponent(details[property]);
        formBody.push(encodedKey + "=" + encodedValue);
      }
      formBody = formBody.join("&");

      let headerCookie = `_SID=${
        obj.sid
      }; isCookieAllowed=true; _ga=GA1.2.1317900043.1513959557; _gid=GA1.2.1089172434.1513959557; _gat=1`;

      return fetch(urlLogin, {
        method: "POST",
        redirect: "manual",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36",
          Referer: "https://service.winsim.de/",
          Origin: "https://service.winsim.de/",
          Cookie: headerCookie
        },
        body: formBody
      });
    })
    .then(response => {

      /* Response Login */

      console.log("response.ok: ", response.ok);
      if (response.statusText !== "Found") {
        errorMsg = {
          message: `The response status is:  ${response.status}`,
          status: 301
        };
        throw errorMsg;
      }

      const setCookie = response.headers.get("set-cookie");
      console.log(setCookie);

      if (setCookie === null) {
        errorMsg = {
          message: `Benutzer oder Passwort falsch`,
          status: 302
        };
        throw errorMsg;
      }

      // Split Set-Cookie String by ";" to get each key/value pair
      // Set-Cookie: _SID=2i52totljib4gqh7j0rd9o5ah1; expires=Mon, 01-Jan-2018 09:32:22 GMT; Max-Age=3600; path=/; secure; HttpOnly, sw_TKN=deleted; expires=Thu, 01-Jan-1970 00:00:01 GMT; Max-Age=0; path=/; secure; httponly, sw_LGN=1; path=/; secure; httponly, sw_UNC=deleted; expires=Thu, 01-Jan-1970 00:00:01 GMT; Max-Age=0; path=/; httponly
      // Split by ";": ["_SID=2i52totljib4gqh7j0rd9o5ah1"," expires=Mon, 01-Jan-2018 09:32:22 GMT"," Max-Age=3600"," path=/"," secure"," HttpOnly, sw_TKN=deleted"," expires=Thu, 01-Jan-1970 00:00:01 GMT"," Max-Age=0"," path=/"," secure"," httponly, sw_LGN=1"," path=/"," secure"," httponly, sw_UNC=deleted"," expires=Thu, 01-Jan-1970 00:00:01 GMT"," Max-Age=0"," path=/"," httponly"]"
      // Split by "=" and assign to obj: {"_SID":"2i52totljib4gqh7j0rd9o5ah1"," expires":"Mon, 01-Jan-2018 09:32:22 GMT"," Max-Age":"3600"," path":"/"," HttpOnly, sw_TKN":"deleted"," httponly, sw_LGN":"1"," httponly, sw_UNC":"deleted"}
      const splitCookie = setCookie.split(";");
      const obj = {};

      for (let index = 0; index < splitCookie.length; index++) {
        const element = splitCookie[index];
        const elementSplit = element.split("=");
        if (typeof obj[elementSplit[0].trim()] === "undefined") {
          obj[elementSplit[0].trim()] = elementSplit[1];
        }
      }

      console.log(JSON.stringify(obj))

      // Check that "_SID" exists
      if (typeof obj["_SID"] === "undefined" || obj["_SID"].length === 0) {
        errorMsg = {
          message: `No value for _SID`,
          status: 303
        };
        throw errorMsg;
      }
      cookie.sid = obj["_SID"];

      // Check that "expires" exists
      if (typeof obj["expires"] === "undefined" || obj["expires"].length === 0) {
        errorMsg = {
          message: `No value for expires`,
          status: 304
        };
        throw errorMsg;
      }
      cookie.expires = obj["expires"];

      // Check that "Max-Age" exists
      if (typeof obj["Max-Age"] !== "undefined" || obj["Max-Age"].length !== 0) {
        cookie.maxage = Number.parseFloat(obj["Max-Age"]);
      }

      return obj["_SID"];
    })
    .then(sid => {
      /* Data Usage */
      console.log("Start Data Usage with _SID: ", sid);

      const headerCookie = `_ga=GA1.2.675400527.1514359654; _gid=GA1.2.1082750695.1514359654; isCookieAllowed=true; te_sid=c1e2ae4f-466f-aa69-42c3-3ed0c58b94be;; Bestandskunde=true; _gat=1; _SID=${sid}; sw_LGN=1`;
      return fetch(urlDataUsage, {
        method: "GET",
        headers: {
          Cookie: headerCookie,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "de,en;q=0.9,en-US;q=0.8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          Host: "service.winsim.de",
          Pragma: "no-cache",
          Referer: "https://service.winsim.de/start",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36"
        }
      });
    })
    .then(response => {
      console.log("Data Usage response");
      if (response.statusText !== "OK") {
        errorMsg = {
          message: `Data Usage response not ok`,
          status: 401
        };
        throw errorMsg;
      }

      if (
        response.ok &&
        response.url !==
          "https://service.winsim.de/mytariff/invoice/showGprsDataUsage"
      ) {
        errorMsg = {
          message: `No response from "showGprsDataUsage"`,
          status: 401
        };
        throw errorMsg;
      }

      return response.text();
    })
    .then(body => {
      console.log("Data Usage start parsing");

      const parser = new DOMParser(domParserOptions);
      const xmlDoc = parser.parseFromString(body);

      // "Benutzername" and "Rufnummer"
      const userData = xmlDoc
        .getElementById("userData")
        .getElementsByTagName("p");
      let benutzername,
        rufnummer = "";

      const userDataBenutzername = userData
        .item(0)
        .textContent.replace(/ /g, "");
      if (userDataBenutzername.includes(":")) {
        benutzername = userDataBenutzername.split(":")[1];
      }

      const userDataRufnummer = userData.item(1).textContent.replace(/ /g, "");
      if (userDataRufnummer.includes(":")) {
        rufnummer = userDataRufnummer.split(":")[1];
      }

      if (benutzername.length === 0 || rufnummer.length === 0) {
        errorMsg = {
          message: `No Benutzername or Rufummer`,
          status: 501
        };
        throw errorMsg;
      }
      const userDataObj = {
        benutzername: benutzername,
        rufnummer: rufnummer
      };

      // Vertrag: Name, Tariff
      const fastlist = xmlDoc
        .getElementById("fastlist")
        .getElementsByTagName("a");
      let realname,
        tariffdetails = "";

      const fastlistRealName = fastlist.item(0).textContent;
      if (fastlistRealName.includes("Daten ändern")) {
        realname = fastlistRealName.split("Daten ändern")[0].trim();
      }

      const fastlistTariffDetails = fastlist.item(1).textContent;
      if (fastlistTariffDetails.includes("Tarifdetails")) {
        tariffdetails = fastlistTariffDetails.split("Tarifdetails")[0];
      }

      const contractObj = {
        name: realname,
        tarifdetails: tariffdetails
      };

      // Data Volume / Usae for currentMonth
      const currentMonth = xmlDoc
        .getElementById("currentMonth")
        .getElementsByTagName("b");

      const dataVolumeInclusive = currentMonth.item(0)["firstChild"]["data"];
      const dataVolumeUsed = currentMonth.item(2)["firstChild"]["data"];

      const dataUsage = convertUnit(dataVolumeInclusive, dataVolumeUsed);

      res.json({
        benutzerdaten: userDataObj,
        datenvolumen: dataUsage,
        vertrag: contractObj,
        cookie: cookie
      });
    })
    .catch(error => {
      console.log(error);

      if (
        typeof error["message"] !== "undefined" &&
        typeof error["status"] !== "undefined"
      ) {
        return res.status(400).json(error);
      }

      res.status(400).json({
        error: error,
        status: "400"
      });
    });
});

router.get("/login", function(req, res, body) {
  const errorMsg = {
    message: "",
    status: 0
  };

  fetch(url, {
    method: "GET",
    headers: {
      Cookie: "1234",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36",
      Referer: "https://service.winsim.de/",
      Origin: "https://service.winsim.de/"
    }
  })
    .then(response => {
      /* Start Page response */

      if (response.ok === false) {
        errorMsg = {
          message: `The response status is:  ${response.status}`,
          status: 101
        };
        throw errorMsg;
      }

      return response.text();
    })
    .then(body => {
      // Parse page: body
      const parser = new DOMParser(domParserOptions);
      const xmlDoc = parser.parseFromString(body);

      // Get token from html page
      const token = xmlDoc
        .getElementById("UserLoginType__token")
        .getAttribute("value");

      // Get _SID from page
      const inputTags = xmlDoc.getElementsByTagName("input");
      let sid = "";
      for (let index = 0; index < inputTags.length; index++) {
        const element = inputTags.item(index);
        if (
          element.hasAttribute("name") &&
          element.getAttribute("name") == "_SID"
        ) {
          sid = element.getAttribute("value");
        }
      }

      if (token === "") {
        errorMsg = {
          message: `No value for token found at login page`,
          status: 201
        };
        throw errorMsg;
      }
      if (sid === "") {
        errorMsg = {
          message: `No value for _SID found at login page`,
          status: 202
        };
        throw errorMsg;
      }

      return { token, sid };
    })
    .then(obj => {
      /* Request Login Page */

      console.log(obj);
      const details = {
        "UserLoginType[alias]": "mats.becker1",
        "UserLoginType[password]": "Whitney1",
        "UserLoginType[rememberUsername]": "1",
        "UserLoginType[_token]": obj.token,
        "UserLoginType[logindata]": "",
        _SID: obj.sid
      };
      let formBody = [];
      for (let property in details) {
        let encodedKey = encodeURIComponent(property);
        let encodedValue = encodeURIComponent(details[property]);
        formBody.push(encodedKey + "=" + encodedValue);
      }
      formBody = formBody.join("&");
      

      let headerCookie = `_SID=${
        obj.sid
      }; isCookieAllowed=true; _ga=GA1.2.1317900043.1513959557; _gid=GA1.2.1089172434.1513959557; _gat=1`;

      return fetch(urlLogin, {
        method: "POST",
        redirect: "manual",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36",
          Referer: "https://service.winsim.de/",
          Origin: "https://service.winsim.de/",
          Cookie: headerCookie
        },
        body: formBody
      });
    })
    .then(response => {
      console.log("response.ok: ", response.ok);
      if (response.statusText !== "Found") {
        errorMsg = {
          message: `The response status is:  ${response.status}`,
          status: 301
        };
        throw errorMsg;
      }

      const setCookie = response.headers.get("set-cookie");
      console.log(setCookie);

      // Split Set-Cookie String by ";" to get each key/value pair
      // Set-Cookie: _SID=2i52totljib4gqh7j0rd9o5ah1; expires=Mon, 01-Jan-2018 09:32:22 GMT; Max-Age=3600; path=/; secure; HttpOnly, sw_TKN=deleted; expires=Thu, 01-Jan-1970 00:00:01 GMT; Max-Age=0; path=/; secure; httponly, sw_LGN=1; path=/; secure; httponly, sw_UNC=deleted; expires=Thu, 01-Jan-1970 00:00:01 GMT; Max-Age=0; path=/; httponly
      // Split by ";": ["_SID=2i52totljib4gqh7j0rd9o5ah1"," expires=Mon, 01-Jan-2018 09:32:22 GMT"," Max-Age=3600"," path=/"," secure"," HttpOnly, sw_TKN=deleted"," expires=Thu, 01-Jan-1970 00:00:01 GMT"," Max-Age=0"," path=/"," secure"," httponly, sw_LGN=1"," path=/"," secure"," httponly, sw_UNC=deleted"," expires=Thu, 01-Jan-1970 00:00:01 GMT"," Max-Age=0"," path=/"," httponly"]"
      // Split by "=" and assign to obj: {"_SID":"2i52totljib4gqh7j0rd9o5ah1"," expires":"Mon, 01-Jan-2018 09:32:22 GMT"," Max-Age":"3600"," path":"/"," HttpOnly, sw_TKN":"deleted"," httponly, sw_LGN":"1"," httponly, sw_UNC":"deleted"}
      const splitCookie = setCookie.split(";");
      const obj = {};

      for (let index = 0; index < splitCookie.length; index++) {
        const element = splitCookie[index];
        const elementSplit = element.split("=");
        if (typeof obj[elementSplit[0]] === "undefined") {
          obj[elementSplit[0]] = elementSplit[1];
        }
      }

      // Check that '_SID exists
      if (typeof obj["_SID"] === "undefined" && obj["_SID"].length > 0) {
        errorMsg = {
          message: `No value for _SID`,
          status: 302
        };
        throw errorMsg;
      }
      return obj["_SID"];
    })
    .then(sid => {
      /* Data Usage */
      console.log("Start Data Usage with _SID: ", sid);

      const headerCookie = `_ga=GA1.2.675400527.1514359654; _gid=GA1.2.1082750695.1514359654; isCookieAllowed=true; te_sid=c1e2ae4f-466f-aa69-42c3-3ed0c58b94be;; Bestandskunde=true; _gat=1; _SID=${sid}; sw_LGN=1`;
      return fetch(urlDataUsage, {
        method: "GET",
        headers: {
          Cookie: headerCookie,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "de,en;q=0.9,en-US;q=0.8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          Host: "service.winsim.de",
          Pragma: "no-cache",
          Referer: "https://service.winsim.de/start",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36"
        }
      });
    })
    .then(response => {
      console.log("Data Usage response");
      if (response.statusText !== "OK") {
        errorMsg = {
          message: `Data Usage response not ok`,
          status: 401
        };
        throw errorMsg;
      }

      if (
        response.ok &&
        response.url !==
          "https://service.winsim.de/mytariff/invoice/showGprsDataUsage"
      ) {
        errorMsg = {
          message: `No response from "showGprsDataUsage"`,
          status: 401
        };
        throw errorMsg;
      }

      return response.text();
    })
    .then(body => {
      console.log("Data Usage start parsing");

      const parser = new DOMParser(domParserOptions);
      const xmlDoc = parser.parseFromString(body);

      // "Benutzername" and "Rufnummer"
      const userData = xmlDoc
        .getElementById("userData")
        .getElementsByTagName("p");
      let benutzername,
        rufnummer = "";

      const userDataBenutzername = userData
        .item(0)
        .textContent.replace(/ /g, "");
      if (userDataBenutzername.includes(":")) {
        benutzername = userDataBenutzername.split(":")[1];
      }

      const userDataRufnummer = userData.item(1).textContent.replace(/ /g, "");
      if (userDataRufnummer.includes(":")) {
        rufnummer = userDataRufnummer.split(":")[1];
      }

      if (benutzername.length === 0 || rufnummer.length === 0) {
        errorMsg = {
          message: `No Benutzername or Rufummer`,
          status: 501
        };
        throw errorMsg;
      }
      const userDataObj = {
        benutzername: benutzername,
        rufnummer: rufnummer
      };

      // Vertrag: Name, Tariff
      const fastlist = xmlDoc
        .getElementById("fastlist")
        .getElementsByTagName("a");
      let realname,
        tariffdetails = "";

      const fastlistRealName = fastlist.item(0).textContent;
      if (fastlistRealName.includes("Daten ändern")) {
        realname = fastlistRealName.split("Daten ändern")[0];
      }

      const fastlistTariffDetails = fastlist.item(1).textContent;
      if (fastlistTariffDetails.includes("Tarifdetails")) {
        tariffdetails = fastlistTariffDetails.split("Tarifdetails")[0];
      }

      const contractObj = {
        name: realname,
        tarifdetails: tariffdetails
      };

      // Data Volume / Usae for currentMonth
      const currentMonth = xmlDoc
        .getElementById("currentMonth")
        .getElementsByTagName("b");

      const dataVolumeInclusive = currentMonth.item(0)["firstChild"]["data"];
      const dataVolumeUsed = currentMonth.item(2)["firstChild"]["data"];

      const dataUsage = convertUnit(dataVolumeInclusive, dataVolumeUsed);

      res.json({
        benutzerdaten: userDataObj,
        datenvolumen: dataUsage,
        vertrag: contractObj
      });
    })
    .catch(error => {
      console.log(error);

      if (
        typeof error["message"] !== "undefined" &&
        typeof error["status"] !== "undefined"
      ) {
        return res.status(400).json(error);
      }

      res.status(400).json({
        error: error,
        status: "400"
      });
    });
});

const convertUnit = function(inclusive, used) {
  const dataVolume = { inklusiv: 0, verbraucht: 0, einheit: "GB", timestamp: Date.now(), prozent: 0};
  // Remove whitespaces and replace "," with "."
  // "1,10 MB" to "1.10MB"
  inclusive = inclusive.replace(/ /g, "").replace(/,/g, ".");
  used = used.replace(/ /g, "").replace(/,/g, ".");

  // Remove "GB" or "MB" and if "MB" convert to GB
  if (inclusive.includes("GB")) {
    dataVolume.inklusiv = Number.parseFloat(inclusive.split("GB")[0]);
  } else if (inclusive.includes("MB")) {
    dataVolume.inklusiv = convert(Number.parseFloat(inclusive.split("MB")[0])).from('KB').to('GB');
  } else if (inclusive.includes("KB")) {
    dataVolume.inklusiv = convert(Number.parseFloat(inclusive.split("KB")[0])).from('KB').to('GB');
  }

  if (used.includes("GB")) {
    dataVolume.verbraucht = Number.parseFloat(used.split("GB")[0]);
  } else if (used.includes("MB")) {
    dataVolume.verbraucht = convert(Number.parseFloat(used.split("MB")[0])).from('MB').to('GB');
  } else if (used.includes("KB")) {
    dataVolume.verbraucht = convert(Number.parseFloat(used.split("MB")[0])).from('KB').to('GB');
  }

  dataVolume.prozent = dataVolume.verbraucht / dataVolume.inklusiv;

  return dataVolume;
};

module.exports = router;
