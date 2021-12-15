export function delayedPromise(mSec) {
  return new Promise(
    function(resolve, _reject) {
      setTimeout(
        function() {
          resolve(mSec);
        },
        mSec
      );
    }
  );
};

