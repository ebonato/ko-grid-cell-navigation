/**
 * @license Copyright (c) 2015, Ben Schulz
 * License: BSD 3-clause (http://opensource.org/licenses/BSD-3-Clause)
 */
;(function(factory) {
    if (typeof define === 'function' && define['amd'])
        define(['ko-grid', 'knockout', 'ko-data-source', 'ko-indexed-repeat'], factory);
    else
        window['ko-grid-cell-navigation'] = factory(window.ko.bindingHandlers['grid'], window.ko);
} (function(ko_grid, knockout) {
/*
 * Copyright (c) 2015, Ben Schulz
 * License: BSD 3-clause (http://opensource.org/licenses/BSD-3-Clause)
 */
var onefold_dom, ko_grid_cell_navigation_cell_navigation, ko_grid_cell_navigation;
onefold_dom = function () {
  var onefold_dom_internal, onefold_dom;
  onefold_dom_internal = function () {
    function strictlyContains(container, node) {
      return !!(container.compareDocumentPosition(node) & 16);
    }
    function determineDepth(root, node) {
      var depth = 0;
      while (node) {
        if (node === root)
          return depth;
        node = node.parentNode;
        ++depth;
      }
      throw new Error('The given node is not part of the subtree.');
    }
    var Element = window.Element;
    var matches = Element.prototype.webkitMatchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.matches;
    function closest(element, selector) {
      do {
        if (matches.call(element, selector))
          return element;
        element = element.parentElement;
      } while (element);
      return null;
    }
    return {
      determineDepth: determineDepth,
      isOrContains: function (container, node) {
        return container === node || strictlyContains(container, node);
      },
      strictlyContains: strictlyContains,
      element: {
        closest: closest,
        matches: function (element, selector) {
          return matches.call(element, selector);
        }
      }
    };
  }();
  onefold_dom = function (main) {
    return main;
  }(onefold_dom_internal);
  return onefold_dom;
}();

ko_grid_cell_navigation_cell_navigation = function (module, ko, dom, koGrid) {
  var extensionId = 'ko-grid-cell-navigation'.indexOf('/') < 0 ? 'ko-grid-cell-navigation' : 'ko-grid-cell-navigation'.substring(0, 'ko-grid-cell-navigation'.indexOf('/'));
  var KEY_CODE_ARROW_UP = 38, KEY_CODE_ARROW_LEFT = 37, KEY_CODE_ARROW_RIGHT = 39, KEY_CODE_ARROW_DOWN = 40, KEY_CODE_TAB = 9, KEY_CODE_ENTER = 13;
  var KEY_CODES = [
    KEY_CODE_ARROW_UP,
    KEY_CODE_ARROW_LEFT,
    KEY_CODE_ARROW_RIGHT,
    KEY_CODE_ARROW_DOWN,
    KEY_CODE_TAB,
    KEY_CODE_ENTER
  ];
  koGrid.defineExtension(extensionId, {
    initializer: function (template) {
      template.before('table').insert('<textarea class="ko-grid-focus-parking" tabIndex="-1" style="position: absolute; z-index: 10; overflow: hidden; box-sizing: border-box; width: 1em; height: 1em; top: -3em; left: -3em; resize: none; border: none;"></textarea>');
    },
    Constructor: function CellNavigationExtension(bindingValue, config, grid) {
      var onCellFocusedHandlers = [];
      this.onCellFocused = function (handler) {
        return onCellFocusedHandlers.push(handler);
      };
      this['onCellFocused'] = this.onCellFocused;
      var scroller = null, focusParking = null, selectedRow = null, selectedColumn = null, hijacked = null;
      grid.postApplyBindings(function () {
        scroller = grid.element.querySelector('.ko-grid-table-scroller');
        focusParking = grid.element.querySelector('.ko-grid-focus-parking');
      });
      grid.data.onCellClick(function (e, cellValue, row, column) {
        return focus(row, column);
      });
      grid.onKeyDown(function (e) {
        if (e.defaultPrevented || KEY_CODES.indexOf(e.keyCode) < 0)
          return;
        e.preventDefault();
        var multiplier = e.shiftKey ? -1 : 1;
        switch (e.keyCode) {
        case KEY_CODE_ARROW_UP:
          return move(-1, 0);
        case KEY_CODE_ARROW_LEFT:
          return move(0, -1);
        case KEY_CODE_ARROW_RIGHT:
          return move(0, 1);
        case KEY_CODE_ARROW_DOWN:
          return move(1, 0);
        case KEY_CODE_TAB:
          return move(0, multiplier, true);
        case KEY_CODE_ENTER:
          return move(0, multiplier, true);
        }
      });
      /**
       * @param {number} rowWise
       * @param {number} columnWise
       * @param {boolean=} wrap
       */
      function move(rowWise, columnWise, wrap) {
        wrap = !!wrap;
        var rows = grid.data.rows.displayed();
        var cols = grid.columns.displayed();
        var rowIndex = rows.tryFirstIndexOf(selectedRow);
        var colIndex = cols.indexOf(selectedColumn);
        var newRowIndex = rowIndex + rowWise;
        var newColIndex = colIndex + columnWise;
        if (wrap && newColIndex < 0) {
          newRowIndex -= 1;
          newColIndex = cols.length - 1;
        } else if (wrap && newColIndex >= cols.length) {
          newRowIndex += 1;
          newColIndex = 0;
        }
        if (rowWise == 1 && grid.bindingValue.OnRowEnding && newRowIndex >= rows.length) {
          grid.bindingValue.OnRowEnding();
          setTimeout(function () {
            move(rowWise, columnWise, wrap);
          }, 100);
        }
        newColIndex = Math.max(0, Math.min(cols.length - 1, newColIndex));
        newRowIndex = Math.max(0, Math.min(rows.length - 1, newRowIndex));
        focus(rows.get(newRowIndex), cols[newColIndex]);
      }
      function focus(row, column) {
        var cell = grid.data.lookupCell(row, column);
        if (row !== selectedRow || column !== selectedColumn)
          hijack(row, column, cell);
        if (!dom.isOrContains(grid.rootElement, window.document.activeElement)) {
          var focussable = cell.element.querySelector('input, select, textarea');
          if (!focussable) {
            focusParking.value = column.renderValue(ko.unwrap(column.property.indexOf('.') == -1 ? row[column.property] : eval('row.' + column.property)));
            focusParking.setSelectionRange(0, focusParking.value.length);
            focussable = focusParking;
          }
          //Eduardo - Bug over Scroll in Chrome, when user gives an focus on cell editor
          //https://bugs.chromium.org/p/chromium/issues/detail?id=682103
          //https://bugs.chromium.org/p/chromium/issues/detail?id=681382
          //https://bugs.chromium.org/p/chromium/issues/detail?id=675567
          //https://bugs.chromium.org/p/chromium/issues/detail?id=664246
          //Wait for bug final status, so we don't do a real focus for a while
          var isChrome = !!window['chrome'];
          if (!isChrome) {
            focussable.focus();
          }
        }
        scrollIntoView(cell.element);
      }
      function hijack(row, column, cell) {
        if (hijacked)
          hijacked.release();
        hijacked = cell.hijack(function (b) {
          return onCellFocusedHandlers.reduce(function (a, h) {
            return h(row, column, a) || a;
          }, {
            init: function (element, row, column) {
              var $__arguments = arguments;
              selectedRow = row;
              selectedColumn = column;
              b.init.apply(this, $__arguments);
              element.classList.add('focused');
            },
            update: function (element) {
              var $__arguments = arguments;
              b.update.apply(this, $__arguments);
              element.classList.add('focused');
            }
          });
        });
      }
      // TODO scroll containing view port if necessary
      function scrollIntoView(element) {
        var scrollerBounds = scroller.getBoundingClientRect();
        var elementBounds = element.getBoundingClientRect();
        var extra = 7;
        var scrollX = Math.min(0, elementBounds.left - scrollerBounds.left - extra) || Math.max(0, elementBounds.right - scrollerBounds.right + extra + (scroller.offsetWidth - scroller.clientWidth));
        var scrollY = Math.min(0, elementBounds.top - scrollerBounds.top - extra) || Math.max(0, elementBounds.bottom - scrollerBounds.bottom + extra + (scroller.offsetHeight - scroller.clientHeight));
        scroller.scrollLeft += scrollX;
        scroller.scrollTop += scrollY;
      }
    }
  });
  return koGrid.declareExtensionAlias('cellNavigation', extensionId);
}({}, knockout, onefold_dom, ko_grid);
ko_grid_cell_navigation = function (main) {
  return main;
}(ko_grid_cell_navigation_cell_navigation);return ko_grid_cell_navigation;
}));