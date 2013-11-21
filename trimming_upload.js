var layer1 = document.getElementById("layer1");
var layer1Ctx = layer1.getContext("2d");

var layer2 = document.getElementById("layer2");
var layer2Ctx = layer2.getContext("2d");

var display = document.getElementById("upload_canvas");
var displayCtx = display.getContext("2d");

var base = document.getElementById("base");
var baseCtx = base.getContext("2d");

var render = document.getElementById("render");
var renderCtx = render.getContext("2d");

var layers = [layer1, layer2];

var is_down = false;
var trimming_begin_pos = { x: null, y: null };
var trimming_end_pos = { x: null, y: null };

var loaded_file = null;
var max_canvas_size = { width: 900, height: 600 };

$(function() {
  // load image file
  $("#upload_file").change(function() {

    var file = this.files[0];
    if (!file.type.match(/^image\/(png|jpeg|gif)$/)) return;

    var image = new Image();
    var reader = new FileReader();

    reader.onload = function(e) {
      image.onload = function() {

        var min_width = Math.min(this.width, max_canvas_size.width);
        var min_height = Math.min(this.height, max_canvas_size.height);
        var scale = Math.min(min_width / this.width, min_height / this.height);
        var size = {width: this.width * scale, height: this.height * scale};
        
        resizeCanvas(size.width, size.height);
        layer1Ctx.drawImage(image, 0, 0, size.width, size.height);
        updateCanvas();

        $("#upload_button").attr('filename', file.name);
        $("#upload_button").show();
        
        // load file on base buffer
        base.width = this.width;
        base.height = this.height;
        baseCtx.drawImage(image, 0, 0);
      }
      image.src = e.target.result;
    }

    reader.readAsDataURL(file);
  });

  // upload image
  $("#upload_button").click(function(){

    // get blob data from canvas
    var canvas = $('#render');
    var type = 'image/jpeg';
    var dataurl = canvas[0].toDataURL(type);
    var bin = atob(dataurl.split(',')[1]);
    var buffer = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) {
      buffer[i] = bin.charCodeAt(i);
    }
    var blob = new Blob([buffer.buffer], {type: type});

    // upload
    var fd = new FormData();
    fd.append('filename', $(this).attr('filename'));
    fd.append('data', blob);
    $.ajax({
      type: 'POST',
      url: 'http://yoursite',
      data: fd,
      processData: false,
      contentType: false
    }).done(function(data) {
      // done
    });
  });

  // canvas controll
  function resizeCanvas(width, height) {
    for(var i = 0; i < layers.length; i++) {
      layers[i].width = width;
      layers[i].height = height;
    }
    display.width = width;
    display.height = height;
  }

  function updateCanvas() {
    displayCtx.drawImage(layer1, 0, 0, display.width, display.height); 
    displayCtx.drawImage(layer2, 0, 0, display.width, display.height);
  }


  display.addEventListener("mousemove", function(e){}, false);
  display.addEventListener("mouseout", function(e){}, false);
  $('#upload_canvas').on("mousemove", function(e) {
    if (is_down) {
      var mouse_pos = getMousePos(e);
      updateSelectArea(mouse_pos);
    }
  });
  $('#upload_canvas').on("mouseout", function(e) {
  });
  $('#upload_canvas').on("mousedown", function(e) {
    if (is_down == true) return;
    is_down = true;
    trimming_begin_pos = getMousePos(e);
  });
  $('#upload_canvas').on("mouseup", function(e) {
    is_down = false;
    trimming_end_pos = getMousePos(e);

    var begin_pos = trimming_begin_pos;
    var end_pos = trimming_end_pos;

    if (begin_pos.x == end_pos.x && begin_pos.y == end_pos.y) return;
    var begin = {x: 0, y:0};
    var end = {x:0, y:0};
    begin.x = Math.min(begin_pos.x, end_pos.x);
    begin.y = Math.min(begin_pos.y, end_pos.y);
    end.x = Math.max(begin_pos.x, end_pos.x);
    end.y = Math.max(begin_pos.y, end_pos.y);
 
    highlightTrimmingArea(begin, end);
    clip(begin, end);
  });
    
  function getMousePos(e) {
    var rect = display.getBoundingClientRect();
    return {
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top};
  }
    
  function updateSelectArea(mouse_pos) {
    clear(layer2);
    drawRect(layer2,
             trimming_begin_pos.x, 
             trimming_begin_pos.y, 
             mouse_pos.x - trimming_begin_pos.x,
             mouse_pos.y - trimming_begin_pos.y,
             3, 'red');
    updateCanvas();
  }

  function highlightTrimmingArea(begin, end) {
    clear(layer2);
    var fill = "rgba(0, 0, 0, 0.5)";
    fillRect(layer2, 0, 0, layer2.width, begin.y, fill); // top
    fillRect(layer2, 0, begin.y, begin.x, end.y - begin.y, fill); // left
    fillRect(layer2, end.x, begin.y, layer2.width - begin.x, end.y - begin.y, fill); // right
    fillRect(layer2, 0, end.y, layer2.width, layer2.height - end.y, fill); // bottom
    updateCanvas();
  }

  function clear(canvas) {
    var ctx =  canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawRect(canvas, x, y, width, height, line, style) {
    var ctx =  canvas.getContext("2d");
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.lineWidth = line;
    ctx.strokeStyle = style;
    ctx.stroke();
  }

  function fillRect(canvas, x, y, width, height, style) {
    var ctx =  canvas.getContext("2d");
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fillStyle = style;
    ctx.fill();
  }

  function clip(begin, end) {
    var scale = base.width / display.width; // display scale
    var x = begin.x * scale;
    var y = begin.y * scale;
    var width = (end.x - begin.x) * scale;
    var height = (end.y - begin.y) * scale;

    render.width = width;
    render.height = height;
    renderCtx.drawImage( base, x, y, width, height, 0, 0, width, height);
  } 

});
