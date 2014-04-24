'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]);

angular.module('mc.resizer', []).directive('resizer', function($document) {

  return function($scope, $element, $attrs) {
    console.log($scope.$parent)

      $element.on('mousedown', function(event) {
          event.preventDefault();

          $document.on('mousemove', mousemove);
          $document.on('mouseup', mouseup);
      });

      function mousemove(event) {
          $scope.$parent.$broadcast("moveSlidePanel", true );
          if ($attrs.resizer == 'vertical') {
              // Handle vertical resizer
              var x = event.pageX;

              if ($attrs.resizerMax && x > $attrs.resizerMax) {
                  x = parseInt($attrs.resizerMax);
              }

              $element.css({
                  left: x + 'px'
              });

              $($attrs.resizerLeft).css({
                  width: x + 'px'
              });
              $($attrs.resizerRight).css({
                  left: (x + parseInt($attrs.resizerWidth)) + 'px'
              });

          } else {
              // Handle horizontal resizer
              var y = window.innerHeight - event.pageY;

              $element.css({
                  bottom: y + 'px'
              });

              $($attrs.resizerTop).css({
                  bottom: (y + parseInt($attrs.resizerHeight)) + 'px'
              });
              $($attrs.resizerBottom).css({
                  height: y + 'px'
              });
          }
      }

      function mouseup() {
          $scope.$parent.$broadcast("moveSlidePanel", false );
          $document.unbind('mousemove', mousemove);
          $document.unbind('mouseup', mouseup);
      }
  };
});
