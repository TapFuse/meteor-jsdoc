let apiData = options => {
  options = options || {};

  if (typeof options === "string") {
    options = {name: options};
  }

  let root = DocsData[options.name];

  if (! root) {
    console.log("API Data not found: " + options.name);
  }

  if (_.has(options, "options")) {
    root = _.clone(root);

    let includedOptions = options.options.split(';');

    root.options = _.filter(
      root.options,
      option => _.contains(includedOptions, option.name)
    );
  }

  return root;
};

let matchArrayTypeInName = name => {
  if (name.slice(0, 7) === "Array.<") {
    // get the part inside angle brackets like in Array<String>
    let regEx    = /^([^>]+)\.<([^>]+)/;
    let newName  = "Array";
    let match    = name.match(regEx);
    let baseType = match[2];

    if (! baseType) {
      console.log("no array type defined");
      return newName;
    }

    if (match[1].match(regEx) !== null) {
      newName += " of Array";
    }

    newName += " of " + baseType + "s";

    return newName;
  }
};

let changeNamesIfNeeded = nameList => {
  return _.map(nameList, name => {
    // decode the "Array.<Type>" syntax
    if (name.slice(0, 7) === "Array.<") {
      return matchArrayTypeInName(name);
    }

    return name;
  });
};

let toOrSentence = array => {
  if (array.length === 1) {
    return array[0];
  } else if (array.length === 2) {
    return array.join(" or ");
  }

  return _.initial(array).join(", ") + ", or " + _.last(array);
};

let typeNames = nameList => {
  // change names if necessary
  nameList = changeNamesIfNeeded(nameList);
  nameList = _.flatten(nameList);

  return toOrSentence(nameList);
};

Template.autoApiBox.helpers({
  apiData: apiData,
  signature() {
    let signature;
    let escapedLongname = _.escape(this.longname);
    let escapedName = _.escape(this.name);
    let params, paramNames;

    if (this.istemplate || this.ishelper) {
      if (this.istemplate) {
        signature = "HTML: {{> ";
      } else {
        signature = "HTML: {{ ";
      }

      signature += escapedName;

      params = this.params;

      paramNames = _.map(params, param => {
        let name = param.name;

        name = name + "=" + name;

        if (param.optional) {
          return "[" + name + "]";
        }

        return name;
      });

      signature += " " + paramNames.join(" ");

      signature += " }}";
      signature += `<br> JADE: +${escapedName} ${paramNames.join(" ")}`
    } else if (this.ismethod) {
      paramNames = _.map(this.params, param => {
        let name = param.name;
        return name;
      });
      if (paramNames.length > 0) {
        signature = `Meteor.call(${this.name}, ${paramNames.join(", ")}, [asyncCallback])`;
      } else {
        signature = `Meteor.call(${this.name}, [asyncCallback])`;
      }
    } else {
      let beforeParens = escapedLongname;

      if (this.scope === "instance") {
        if (apiData(this.memberof)) {
          beforeParens = "<em>" + apiData(this.memberof).instancename + "</em>." + this.name;
        }
      } else if (this.kind === "class") {
        beforeParens = "new " + escapedLongname;
      }

      signature = beforeParens;

      // if it is a function, and therefore has arguments
      if (_.contains(["function", "class"], this.kind)) {
        params = this.params;

        paramNames = _.map(params, param => {
          if (param.optional) {
            return "[" + param.name + "]";
          }

          return param.name;
        });

        signature += "(" + paramNames.join(", ") + ")";
      }
    }

    return signature;
  },
  typeNames() {
    if (Session.get("showAllTypes") && this.type) {
      return typeNames(this.type.names);
    }
  },
  id() {
    return this.longname && this.longname.replace(/[.#]/g, "-");
  },
  arguments() {
    return _.reject(this.params, param => !! this[param.name]);
  },
  specialArguments() {
    return _.filter(
      _.map(this.params, param => {
        if (_.isArray(this[param.name])) {
          return {
            name     : param.name,
            arguments: this[param.name]
          }
        }
      }),
      specialArgument => specialArgument !== undefined
    );
  }
});

Template.api_box_args.helpers({
  typeNames() {
    return this.type && typeNames(this.type.names);
  }
});

Template.api_box_eg.onRendered(function() {
  hljs.configure({
    tabReplace: "  ",
    useBR: true,
    languages: ["javascript", "css", "json", "coffeescript"]
  });

  this.$("code").each((i, block) => hljs.highlightBlock(block));
});
