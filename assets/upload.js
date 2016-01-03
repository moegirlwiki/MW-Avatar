// Some fields
var maxVisualHeight = 400;
var minDimension = 64;
var multiplier = 1;
var minVisualDim;

var dragMode = 0;

var visualHeight;
var visualWidth;

var maxRes = mw.config.get('wgMaxAvatarResolution');

var startOffset;
var startX;
var startY;

// Objects
var submitButton = $('[type=submit]');
var container = $('<div class="cropper-container" disabled=""/>');
var imageObj = $('<img src=""></img>');
var selector = $('<div class="cropper"><div class="tl-resizer"/><div class="tr-resizer"/><div class="bl-resizer"/><div class="br-resizer"/></div>');
var hiddenField = $('[name=avatar]');
var pickfile = $('#pickfile');
var errorMsg = $('#errorMsg');

// Helper function to limit the selection clip
function normalizeBound(inner, outer) {
  if (inner.left < outer.left) {
    inner.left = outer.left;
  }
  if (inner.left + inner.width > outer.left + outer.width) {
    inner.left = outer.left + outer.width - inner.width;
  }
  if (inner.top < outer.top) {
    inner.top = outer.top;
  }
  if (inner.top + inner.height > outer.top + outer.height) {
    inner.top = outer.top + outer.height - inner.height;
  }
}

function normalizeRange(pt, min, max) {
  if (pt < min) {
    return min;
  } else if (pt > max) {
    return max;
  } else {
    return pt;
  }
}

// Helper function to easily get bound
function getBound(obj) {
  var bound = obj.offset();
  bound.width = obj.width();
  bound.height = obj.height();
  return bound;
}

function setBound(obj, bound) {
  obj.offset(bound);
  obj.width(bound.width);
  obj.height(bound.height);
}

function cropImage(image, x, y, dim, targetDim) {
  if (dim > 2 * targetDim) {
    var crop = cropImage(image, x, y, dim, 2 * targetDim);
    return cropImage(crop, 0, 0, 2 * targetDim, targetDim);
  } else {
    var buffer = $('<canvas/>')
      .attr('width', targetDim)
      .attr('height', targetDim)[0];
    buffer
      .getContext('2d')
      .drawImage(image, x, y, dim, dim, 0, 0, targetDim, targetDim);
    return buffer;
  }
}

// Event listeners
function updateHidden() {
  var bound = getBound(selector);
  var outer = getBound(container);
  // When window is zoomed,
  // width set != width get, so we do some nasty trick here to counter the effect
  var dim = Math.round((bound.width - container.width() + visualWidth) * multiplier);
  var res = dim;
  if (res > maxRes) {
    res = maxRes;
  }
  var image = cropImage(imageObj[0],
    (bound.left - outer.left) * multiplier,
    (bound.top - outer.top) * multiplier,
    dim, res)
  hiddenField.val(image.toDataURL());
}

function onDragStart(event) {
  startOffset = getBound(selector);
  startX = event.pageX;
  startY = event.pageY;
  event.preventDefault();
  event.stopPropagation();

  $('body').on('mousemove', onDrag).on('mouseup', onDragEnd);
}

function onDrag(event) {
  var bound = getBound(selector);
  var outer = getBound(container);
  var point = {
    left: event.pageX,
    top: event.pageY,
    width: 0,
    height: 0
  };
  normalizeBound(point, outer);
  var deltaX = point.left - startX;
  var deltaY = point.top - startY;

  // All min, max below uses X direction as positive
  switch(dragMode) {
    case 0:
      bound.left = startOffset.left + deltaX;
      bound.top = startOffset.top + deltaY;
      normalizeBound(bound, outer);
      break;
    case 1:
      var min = -Math.min(startOffset.left - outer.left, startOffset.top - outer.top);
      var max = startOffset.width - minDimension;
      deltaX = deltaY = normalizeRange(Math.min(deltaX, deltaY), min, max);
      bound.width = startOffset.width - deltaX;
      bound.left = startOffset.left + startOffset.width - bound.width;
      bound.height = startOffset.height - deltaY;
      bound.top = startOffset.top + startOffset.height - bound.height;
      break;
    case 2:
      var min = minDimension - startOffset.width;
      var max = Math.min(
        outer.left + outer.width - startOffset.left - startOffset.width,
        startOffset.top - outer.top
      );
      deltaY = -(deltaX = normalizeRange(Math.max(deltaX, -deltaY), min, max));
      bound.width = startOffset.width + deltaX;
      bound.height = startOffset.height - deltaY;
      bound.top = startOffset.top + startOffset.height - bound.height;
      break;
    case 3:
      var min = -Math.min(
        startOffset.left - outer.left,
        outer.top + outer.height - startOffset.top - startOffset.height
      );
      var max = startOffset.width - minDimension;
      deltaY = -(deltaX = normalizeRange(Math.min(deltaX, -deltaY), min, max));
      bound.width = startOffset.width - deltaX;
      bound.left = startOffset.left + startOffset.width - bound.width;
      bound.height = startOffset.height + deltaY;
      break;
    case 4:
      var min = minDimension - startOffset.width;
      var max = Math.min(
        outer.left + outer.width - startOffset.left - startOffset.width,
        outer.top + outer.height - startOffset.top - startOffset.height
      );
      deltaX = deltaY = normalizeRange(Math.max(deltaX, deltaY), min, max);
      bound.width = startOffset.width + deltaX;
      bound.height = startOffset.height + deltaY;
      break;
  }

  setBound(selector, bound);
  event.preventDefault();
}

function onDragEnd(event) {
  $('body').off('mousemove', onDrag).off('mouseup', onDragEnd);
  event.preventDefault();

  updateHidden();
}

function onImageLoaded() {
  var width = imageObj.width();
  var height = imageObj.height();

  if (width < minDimension || height < minDimension) {
    errorMsg.text(mw.msg('avatar-toosmall'));
    imageObj.attr('src', '');
    container.attr('disabled', '');
    submitButton.attr('disabled', '');
    return;
  }

  errorMsg.text('');

  container.removeAttr('disabled');
  submitButton.removeAttr('disabled');
  visualHeight = height;
  visualWidth = width;

  if (visualHeight > maxVisualHeight) {
    visualHeight = maxVisualHeight;
    visualWidth = visualHeight * width / height;
  }

  multiplier = width / visualWidth;
  minVisualDim = minDimension / multiplier;

  container.width(visualWidth);
  container.height(visualHeight);
  imageObj.width(visualWidth);
  imageObj.height(visualHeight);

  var bound = getBound(container);
  bound.width = bound.height = Math.min(bound.width, bound.height);
  setBound(selector, bound);
  updateHidden();
}

function onImageLoadingFailed() {
  if(!imageObj.attr('src')) {
    return;
  }

  errorMsg.text(mw.msg('avatar-invalid'));
  imageObj.attr('src', '');
  container.attr('disabled', '');
  submitButton.attr('disabled', '');
  return;
}

// Event registration
selector.on('mousedown', function(event) {
  dragMode = 0;
  onDragStart(event);
});
selector.find('.tl-resizer').on('mousedown', function(event) {
  dragMode = 1;
  onDragStart(event);
});
selector.find('.tr-resizer').on('mousedown', function(event) {
  dragMode = 2;
  onDragStart(event);
});
selector.find('.bl-resizer').on('mousedown', function(event) {
  dragMode = 3;
  onDragStart(event);
});
selector.find('.br-resizer').on('mousedown', function(event) {
  dragMode = 4;
  onDragStart(event);
});

pickfile.click(function(event) {
  var picker = $('<input type="file"/>');
  picker.change(function(event) {
    var file = event.target.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onloadend = function() {
        imageObj.width('auto').height('auto');
        imageObj.attr('src', reader.result);
      }
      reader.readAsDataURL(file);
    }
  });
  picker.click();
  event.preventDefault();
});

imageObj
  .on('load', onImageLoaded)
  .on('error', onImageLoadingFailed);


// UI modification
submitButton.attr('disabled', '');
container.append(imageObj);
container.append(selector);
hiddenField.before(container);