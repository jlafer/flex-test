# jlafer-fnal-util

This is a collection of utility functions that I find useful when working with objects, arrays and dates.

NOTE: documentation of functions to follow. So...if you stumbled across this package and were planning on using it - buyer beware. Perhaps better is to look at the source on GitHub and see/copy the code.

## Installation

    npm install --save jlafer-fnal-util

## Helper Functions

### kvListToObj
```
kvListToObj :: (string, string) -> [object] -> object
```
This HOF takes two strings -- representing the keys of property keys and their values -- and will create a function that transforms an array of such key-value objects into an object with a property for each item. It is useful for mapping an array of properties into a dictionary object.
```javascript
  const props = [
    {name: 'name', value: 'size'},
    {name: 'type', value: 'string'},
    {name: 'descr', value: 'product size'}
  ];
  const nameValueListToObj = kvListToObj('name', 'value');
  nameValueListToObj(props)  //-> {name: 'size', type: 'string', descr: 'product size'}
```
### makeMapFirstOfPairFn
```
makeMapFirstOfPairFn :: mapFn -> pair -> pair
```
This HOF takes a mapper and will create a function that, given a pair (i.e., an array of length two), will transform the first element of the pair. It is useful for mapping an array of pairs - often one created from an object's keys and values.
```javascript
  const strings = ['hdr', 'My Heading'];
  const mapFirstToUpper = makeMapFirstOfPairFn(R.toUpper);
  mapFirstToUpper(strings)  //-> ['HDR', 'My Heading']
```
### mapKeysOfObject
```
mapKeysOfObject :: mapFirstOfPairFn -> object -> object
```
This HOF takes a mapper and will create a function that will transform all keys of an object. The supplied mapper function must transform the first element of a pair array. Such a mapper can be made with the `makeMapFirstOfPairFn` HOF.
```javascript
  const strings = {
    header: 'My Header',
    body: 'My Body',
    footer: 'My Footer'
  };
  const mapFirstToUpper = makeMapFirstOfPairFn(R.toUpper);
  const mapKeysToUpper = mapKeysOfObject(mapFirstToUpper);
  mapKeysToUpper(strings) //-> {HEADER: 'My Header', BODY: 'My Body', FOOTER: 'My Footer'}
```

### pickNamesAndValues
```
pickNamesAndValues :: [object] -> object
```
Given an array of objects, each of which contains `name` and `value` properties, this function will return an object having the `name` values as keys, with associated values taken from the corresponding input `value` values.
```javascript
const input = [
  {name: 'length', value: 10},
  {name: 'datatype', value: 'string'}
];
pickNamesAndValues(input)  //=> {length: 10, datatype: 'string'}
```

### valueIsObject
```
valueIsObject :: a -> boolean
```
```javascript
valueIsObject({foo: 'bar'})  //=> true
valueIsObject(42)  //=> false
valueIsObject([42, 43])  //=> false
```

### valueNotObject
```
valueNotObject :: a -> boolean
```
```javascript
valueNotObject(42)  //=> true
valueNotObject([42, 43])  //=> true
valueNotObject({foo: 'bar'})  //=> false
```
### valueIsArray
```
valueIsArray :: a -> boolean
```
```javascript
valueIsArray([])  //-> true
valueIsArray([1, 2, 3])  //-> true
valueIsArray({foo: 'bar'})  //-> false
```

### isNotNil
```
isNotNil :: a -> boolean
```
```javascript
isNotNil(42) //-> true
isNotNil({}) //-> true
isNotNil([]) //-> true
isNotNil(null) //-> false
```

### isNotEquals
```
isNotEquals :: a -> b -> boolean
```
```javascript
isNotEquals(42, 43) //-> true
isNotEquals(42, null) //-> true
isNotEquals(42, 21*2) //-> false
isNotEquals('foobar', 'foo'+'bar') //-> false
```

### isoDateToMsec
```
isoDateToMsec :: isoString -> integer
```
```javascript
  const date1 = new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
  isoDateToMsec(date1.toISOString()) //-> 0
  const date2 = new Date('December 17, 1990 00:00:00');
  isoDateToMsec(date2) //-> 661420800000
```

### dtToIsoLocal
```
dtToIsoLocal :: [Date || isoString] -> isoString
```
```javascript
  const date1 = new Date('December 17, 2018 00:00:00');
  dtToIsoLocal(date1) //-> '2018-12-17T00:00:00-08:00'
```

### sumProps
```
sumProps :: object -> number
```
```javascript
const quarterSales = {q1: 100, q2: 90, q3: 120, q4: 130};
sumProps(quarterSales);  //=> 440
const noSales = {};
sumProps(noSales);  //=> 0
```

### getKeyOfMaxProp
```
getKeyOfMaxProp :: object -> string
```
```javascript
const quarterSales = {q1: 100, q2: 90, q3: 120, q4: 130};
getKeyOfMaxProp(quarterSales);  //=> 130
const noSales = {};
getKeyOfMaxProp(noSales);  //=> ''
```
