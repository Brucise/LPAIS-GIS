Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ZmU4NDQwZS02ZDJhLTQ0N2YtYmI2OS1hOTExOTM2ZTA4NmMiLCJpZCI6MjMwNjgxLCJpYXQiOjE3MjIyNDk0OTd9.Z4ry8sAwhUIJc0DoticSaUUie6uOJmPcGVYpztUkj3Q'
var viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: Cesium.createWorldTerrain({        //开启在线地形
              requestWaterMask: true,                           //指示客户端是否应从服务器请求额外的照明信息
              requestVertexNormals: true                        //指示客户端是否应从服务器请求每个瓷砖水面具
        }),
        imageryProvider: new Cesium.UrlTemplateImageryProvider({
            url: 'http://mt1.google.cn/maps/vt?lyrs=s&x={x}&y={y}&z={z}',
            credit: '',
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
        }),
        shouldAnimate: true,
        timeline: true,
        animation: false,
    });
    var addingPath = false;
    var paths = [];
    var selectedPath = null;
    var isMouseDown = false;
    var lastMousePosition = null;
    var flyLine = null; // 全局定义 flyLine
    var currentPathPoints = [];
    var pathEntities = [];
    var lastPointTime = Date.now();

    function createFlyData(points) {
        return points.map(point => ({
            position: Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, point.altitude),
            datatime: Cesium.JulianDate.fromDate(new Date(point.datatime))
        }));
    }

    function showFlyLine(viewer, points, modelOptions, speed, entity) {
        let flyData = createFlyData(points);

        let property = new Cesium.SampledPositionProperty();
        flyData.forEach(point => {
          if (Cesium.defined(point.datatime) && Cesium.defined(point.position)) {
              property.addSample(point.datatime, point.position);
          } else {
              console.error('Invalid sample data', point);
          }
      });

        viewer.clock.multiplier = speed;
        viewer.clock.startTime = flyData[0].datatime.clone();
        viewer.clock.stopTime = flyData[flyData.length - 1].datatime.clone();
        viewer.clock.currentTime = flyData[0].datatime.clone();
        viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        viewer.clock.shouldAnimate = true;
        viewer.trackedEntity = entity;
        return entity;
    }

    function createFlyLine(viewer, points, modelOptions, speed) {
        let flyData = createFlyData(points);

        let property = new Cesium.SampledPositionProperty();
        flyData.forEach(point => {
          if (Cesium.defined(point.datatime) && Cesium.defined(point.position)) {
              property.addSample(point.datatime, point.position);
          } else {
              console.error('Invalid sample data', point);
          }
      });


        let entity = viewer.entities.add({
            availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
                start: flyData[0].datatime,
                stop: flyData[flyData.length - 1].datatime
            })]),
            position: property,
            orientation: new Cesium.VelocityOrientationProperty(property),
            model: {
                uri: modelOptions.url,
                scale: modelOptions.scale,
                minimumPixelSize: modelOptions.minimumPixelSize,
            },
            path: {
                resolution: 1,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.1,
                    color: Cesium.Color.YELLOW
                }),
                width: 10
            }
        });

        viewer.clock.multiplier = speed;
        viewer.clock.startTime = flyData[0].datatime.clone();
        viewer.clock.stopTime = flyData[flyData.length - 1].datatime.clone();
        viewer.clock.currentTime = flyData[0].datatime.clone();
        viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        viewer.clock.shouldAnimate = true;

        viewer.trackedEntity = entity;

        return entity;
    }

    function destroyFlyLine(viewer, entity) {
        if (entity) {
            viewer.entities.remove(entity);
            viewer.trackedEntity = undefined;
            viewer.clock.shouldAnimate = false;
            updatePathSelector();
        }
    }

     function addPath(name, points) {
        let modelOptions = {
            url: 'Cesium_Air.glb',
            scale: 0.01,
            minimumPixelSize: 100
        };
        pathEntities[name] = createFlyLine(viewer, points, modelOptions, 10);
        updatePathSelector();
    }

    function updatePathSelector() {
        var pathSelector = document.getElementById('pathSelector');
        pathSelector.innerHTML = '';
        for (var path in pathEntities) {
            var option = document.createElement('option');
            option.value = path;
            option.text = path;
            pathSelector.add(option);
        }
    }

    function selectPath(pathId) {
        var path = paths.find(p => p.id == pathId);
        if (path) {
            selectedPath = path;
            flyLine = createFlyLine(viewer, path.points, modelOptions, 10);
        }
    }

    document.getElementById('start').onclick = function () {
        if (selectedPath) {

            flyLine = showFlyLine(viewer, selectedPath.points, modelOptions, 10, pathEntities[document.getElementById('pathSelector')]);
        }
    };

    document.getElementById('quit').onclick = function () {
        destroyFlyLine(viewer, pathEntities[document.getElementById('pathSelector')]);
    };

   document.getElementById('startAddPath').onclick = function () {
        addingPath = true;
        currentPathPoints = [];
        lastPointTime = Date.now();
    };

    document.getElementById('endAddPath').onclick = function () {
        addingPath = false;
        var pathName = prompt("请输入路径名称:");
        if (pathName && currentPathPoints.length > 0) {
            addPath(pathName, currentPathPoints);
        }
        currentPathPoints = [];
    };

    document.getElementById('pathSelector').onchange = function () {
        var pathId = this.value;
        selectPath(pathId);
    };

    var modelOptions = {
        url: 'Cesium_Air.glb',
        scale: 0.01,
        minimumPixelSize: 100
    };

    // Camera transformation and tracking
    function getModelMatrix(entity, time, result) {
        var position = Cesium.Property.getValueOrUndefined(
            entity.position,
            time,
            new Cesium.Cartesian3()
        );
        if (!Cesium.defined(position)) {
            return undefined;
        }
        var orientation = Cesium.Property.getValueOrUndefined(
            entity.orientation,
            time,
            new Cesium.Quaternion()
        );
        if (!Cesium.defined(orientation)) {
            result = Cesium.Transforms.eastNorthUpToFixedFrame(
                position,
                undefined,
                result
            );
        } else {
            result = Cesium.Matrix4.fromRotationTranslation(
                Cesium.Matrix3.fromQuaternion(orientation, matrix3Scratch),
                position,
                result
            );
        }
        return result;
    }

    var matrix3Scratch = new Cesium.Matrix3();
    var scratch = new Cesium.Matrix4();
    var renderListener = function (e) {
        if (viewer.trackedEntity && !isMouseDown) {
            getModelMatrix(viewer.trackedEntity, viewer.clock.currentTime, scratch);

            var transformX = -90; // Distance from the entity (behind)
            var transformZ = 55; // Height from the entity (above)
            var transformY = 0; // Lateral distance from the entity

            viewer.scene.camera.lookAtTransform(
                scratch,
                new Cesium.Cartesian3(transformX, transformY, transformZ)
            );
        }
    };

    viewer.scene.preRender.addEventListener(renderListener);

    // Zoom in and out functions
    document.getElementById('zoomIn').onclick = function () {
        viewer.camera.zoomIn();
    };

    document.getElementById('zoomOut').onclick = function () {
        viewer.camera.zoomOut();
    };

    // Display latitude, longitude, and camera height on click
    viewer.screenSpaceEventHandler.setInputAction(function (event) {
        if (addingPath) {
            var earthPosition = viewer.camera.pickEllipsoid(
                event.position,
                viewer.scene.globe.ellipsoid
            );
            var cartographic = Cesium.Cartographic.fromCartesian(
                earthPosition,
                viewer.scene.globe.ellipsoid,
                new Cesium.Cartographic()
            );
            var lat = Cesium.Math.toDegrees(cartographic.latitude);
            var lng = Cesium.Math.toDegrees(cartographic.longitude);
            var altitude = cartographic.height;

            // Increase the time by 2 minutes for each new point
            var datatime = new Date(lastPointTime + 120000).toISOString();
            lastPointTime += 120000;

            currentPathPoints.push({
                longitude: lng,
                latitude: lat,
                altitude: altitude,
                datatime: datatime
            });

            // Add a point to the map for visualization
            viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(lng, lat, altitude),
                point: {
                    pixelSize: 10,
                    color: Cesium.Color.RED
                }
            });
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewer.screenSpaceEventHandler.setInputAction(function () {
        isMouseDown = false;
        lastMousePosition = null;
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    viewer.screenSpaceEventHandler.setInputAction(function () {
        isMouseDown = false;
        lastMousePosition = null;
    }, Cesium.ScreenSpaceEventType.RIGHT_UP);

    viewer.screenSpaceEventHandler.setInputAction(function () {
        isMouseDown = true;
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    viewer.screenSpaceEventHandler.setInputAction(function () {
        isMouseDown = true;
    }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);

    // Change camera view
    document.getElementById('cameraView').onchange = function () {
        var selectedView = this.value;
        var namecurrent  = document.getElementById('pathSelector');
        if (selectedView === 'firstPerson') {
              console.log(namecurrent.value)

              viewer.trackedEntity = pathEntities[namecurrent.value];
              console.log(viewer.trackedEntity)
          } else if (selectedView === 'thirdPerson') {
              viewer.trackedEntity = undefined;
              console.log(namecurrent.value)
              console.log(viewer.trackedEntity)
              viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          }
    };



