import * as Communicator from "../hoops-web-viewer.mjs";
export class nodeTranslation {
    constructor(viewer) {
        this._viewer = viewer;
    }

    hideAnimation(nodeIds, time, interval) {
        var count = 0;
        var stepCount =  1;
        var stepTransparence =  1;
        
        if (interval <= time) {
            stepCount =  Math.ceil(time / interval);
            interval = time / stepCount;
            stepTransparence = 1 / time * interval;
        } else {
            this._viewer.model.setNodesVisibility(nodeIds, false);
            return;
        }
        
        var transparence = 1;
        var id = setInterval(() => {
            transparence -= stepTransparence;
            this._viewer.model.setNodesTransparency(nodeIds, transparence);
            count++;
            if (count >= stepCount) {
                this._viewer.model.setNodesVisibility(nodeIds, false);
                this._viewer.model.resetNodesTransparency(nodeIds);
                clearInterval(id);
            }
        }, interval);
    }

    translate(nodeIds, vector, time, distance, interval, assyGuideLine) {
        return new Promise((resolve, reject) => {
            if (undefined == nodeIds) return resolve();

            var count = 0;
            var stepCount = Math.ceil(time / interval);
            var stepDistance = distance / stepCount;
            //By giving pointer of the assemblyGuideLine instance, you will be able to draw assembly guide lines while animation
            var assyGuideLine = assyGuideLine;
            
            if (undefined != assyGuideLine) {
                assyGuideLine.animationStart();
            }

            var nodeTranslationMatrixes = [];
            var initMatrixes = [];
            var finalTranslationMatrixes = [];
            var matrixArr = [];

            for (var i = 0; i < nodeIds.length; i++) {
                var nodeLocalVector = this._convertToLocalVector(nodeIds[i], vector);
                nodeTranslationMatrixes.push(new Communicator.Matrix());
                nodeTranslationMatrixes[i].setTranslationComponent(
                    nodeLocalVector.x * stepDistance, 
                    nodeLocalVector.y * stepDistance, 
                    nodeLocalVector.z * stepDistance);

                initMatrixes.push(this._viewer.model.getNodeMatrix(nodeIds[i]));
                finalTranslationMatrixes.push(new Communicator.Matrix());
                finalTranslationMatrixes[i].setTranslationComponent(
                    nodeLocalVector.x * distance, 
                    nodeLocalVector.y * distance, 
                    nodeLocalVector.z * distance);
            }

            var id = setInterval(() => {
                count++;
                for (var i = 0; i < nodeIds.length; i++) {
                    if (count < stepCount) {
                        var nodeMatrix = this._viewer.model.getNodeMatrix(nodeIds[i]);
                        this._viewer.model.setNodeMatrix(nodeIds[i], Communicator.Matrix.multiply(nodeMatrix, nodeTranslationMatrixes[i]));
                    }
                    else {
                        var matrix = Communicator.Matrix.multiply(initMatrixes[i], finalTranslationMatrixes[i]);
                        this._viewer.model.setNodeMatrix(nodeIds[i], matrix);
                        matrixArr.push(matrix);
                    }
                }
                // Increment markup line while animation
                if (undefined != assyGuideLine) {
                    assyGuideLine.animationIncrement(count);
                }

                if (count == stepCount) {
                    clearInterval(id);

                    //  When animation is finished, remove dynamic markup lines and draw static polyline 
                    if (undefined != assyGuideLine) {
                        assyGuideLine.animationEnd();
                    }

                    resolve(matrixArr);
                }
            }, interval);
        });
    }

    rotate(nodeIds, rotationAxis, basePoint, time, angle, interval) {
        return new Promise((resolve, reject) => {
            if (undefined == nodeIds) return resolve();

            var count = 0;
            var stepCount = Math.ceil(time / interval);
            var stepAngle = angle / stepCount;
            var translationMatrix = new Communicator.Matrix();
            var nodeRotationMatrixes = [];
            var localPoints = [];
            var initMatrixes = [];
            var finalRotationMatrixes = [];
            let matrixArr = new Array(0);

            for (var i = 0; i < nodeIds.length; i++) {
                var nodeLocalAxis = this._convertToLocalVector(nodeIds[i], rotationAxis);
                nodeRotationMatrixes.push(Communicator.Matrix.createFromOffAxisRotation(nodeLocalAxis, stepAngle));
                initMatrixes.push(this._viewer.model.getNodeMatrix(nodeIds[i]));
                finalRotationMatrixes.push(Communicator.Matrix.createFromOffAxisRotation(nodeLocalAxis, angle));
                localPoints.push(this._convertToLocalPoint(nodeIds[i], basePoint))
            }

            var id = setInterval(() => {
                count++;
                for (var i = 0; i < nodeIds.length; i++) {
                    var roMatrix;
                    var nodeMatrix;
                    if (count < stepCount) {
                        roMatrix = nodeRotationMatrixes[i];
                        nodeMatrix = this._viewer.model.getNodeMatrix(nodeIds[i]);
                    }
                    else {
                        roMatrix = finalRotationMatrixes[i];
                        nodeMatrix = initMatrixes[i];
                    }

                    var point = Communicator.Point3.zero();
                    roMatrix.transform(localPoints[i], point);
                    translationMatrix.setTranslationComponent(
                        localPoints[i].x - point.x,
                        localPoints[i].y - point.y,
                        localPoints[i].z - point.z);

                    var multiplyMatrix = Communicator.Matrix.multiply(nodeMatrix, roMatrix);
                    multiplyMatrix = Communicator.Matrix.multiply(multiplyMatrix, translationMatrix);
                    this._viewer.model.setNodeMatrix(nodeIds[i], multiplyMatrix);

                    if (count == stepCount) {
                        matrixArr.push(multiplyMatrix);
                    }
                }

                if (count == stepCount) {
                    clearInterval(id);
                    resolve(matrixArr);
                }
            }, interval);
        });
    }

    _convertToLocalVector(nodeId, vector) {
        var parentNode = this._viewer.model.getNodeParent(nodeId);
        var netMatrix = this._viewer.model.getNodeNetMatrix(parentNode);
        var inverseMatrix = Communicator.Matrix.inverse(netMatrix);
        var localVector0 = Communicator.Point3.zero();
        inverseMatrix.transform(Communicator.Point3.zero(), localVector0);
        var localVector1 = Communicator.Point3.zero();
        inverseMatrix.transform(vector, localVector1);
        var localVect = new Communicator.Point3(
            localVector1.x - localVector0.x, 
            localVector1.y - localVector0.y, 
            localVector1.z - localVector0.z);

        return localVect.normalize();
    }

    _convertToLocalPoint(nodeId, point) {
        var parentNode = this._viewer.model.getNodeParent(nodeId);
        var netMatrix = this._viewer.model.getNodeNetMatrix(parentNode);
        var inverseMatrix = Communicator.Matrix.inverse(netMatrix);
        let localPoint = Communicator.Point3.zero();
        inverseMatrix.transform(point, localPoint);
        return localPoint;
    }

    blinkMarkup(markupItem) {
        count = 0;
        var interval = 200;
        var circleMarkupHandle;

        var id = setInterval(() => {
            if (count % 2 == 0) {
                circleMarkupHandle = this._viewer.markupManager.registerMarkup(markupItem);
            } else {
                this._viewer.markupManager.unregisterMarkup(circleMarkupHandle);
            }
            count++;
            if (count >= 6) {
                clearInterval(id);
            }
        }, interval);
    }
}

