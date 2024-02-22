class CuttingSectionCommands {
    constructor(viewer) {
        this._viewer = viewer;
        this._planeArr = new Array(3);
        this._orgReferenceGeometryArr = new Array(3);
        this._currentReferenceGeometryArr = new Array(3);
        this._vector;
        this._box;
        this._isSectioning = false;
        this._isShowSections = true;
        this._sectionIdArr = new Array(0);
    }

    setCappingColor(faceColor, lineColor) {
        this._viewer.cuttingManager.setCappingFaceColor(faceColor);
        this._viewer.cuttingManager.setCappingLineColor(lineColor);
    }

    _createReferenceGeometry(vector, box, position, parcent) {
        let referenceGeometry = new Array(0);

        if (vector.equals(new Communicator.Point3(1, 0, 0)) || vector.equals(new Communicator.Point3(-1, 0, 0))) {
            let h = (box.max.y - box.min.y) * parcent / 100;
            let v = (box.max.z - box.min.z) * parcent / 100;
            referenceGeometry.push(new Communicator.Point3(0, box.min.y - h, box.min.z - v));
            referenceGeometry.push(new Communicator.Point3(0, box.min.y - h, box.max.z + v));
            referenceGeometry.push(new Communicator.Point3(0, box.max.y + h, box.max.z + v));
            referenceGeometry.push(new Communicator.Point3(0, box.max.y + h, box.min.z - v));
        }
        else if (vector.equals(new Communicator.Point3(0, 1, 0)) || vector.equals(new Communicator.Point3(0, -1, 0))) {
            let h = (box.max.x - box.min.x) * parcent / 100;
            let v = (box.max.z - box.min.z) * parcent / 100;
            referenceGeometry.push(new Communicator.Point3(box.min.x - h, 0, box.min.z - v));
            referenceGeometry.push(new Communicator.Point3(box.min.x - h, 0, box.max.z + v));
            referenceGeometry.push(new Communicator.Point3(box.max.x + h, 0, box.max.z + v));
            referenceGeometry.push(new Communicator.Point3(box.max.x + h, 0, box.min.z - v));
        }          
        else if (vector.equals(new Communicator.Point3(0, 0, 1)) || vector.equals(new Communicator.Point3(0, 0, -1))) {
            let h = (box.max.x - box.min.x) * parcent / 100;
            let v = (box.max.y - box.min.y) * parcent / 100;
            referenceGeometry.push(new Communicator.Point3(box.min.x - h, box.min.y - v, 0));
            referenceGeometry.push(new Communicator.Point3(box.min.x - h, box.max.y + v, 0));
            referenceGeometry.push(new Communicator.Point3(box.max.x + h, box.max.y + v, 0));
            referenceGeometry.push(new Communicator.Point3(box.max.x + h, box.min.y - v, 0));
        }
        else {
            referenceGeometry = this._viewer.cuttingManager.createReferenceGeometryFromFaceNormal(vector, position, box);
        }

        return referenceGeometry;
    }

    _vector2SectionId(vector) {
        let sectionId;
        if (vector.equals(new Communicator.Point3(1, 0, 0)) || vector.equals(new Communicator.Point3(-1, 0, 0))) {
            sectionId = 0;
        }
        else if (vector.equals(new Communicator.Point3(0, 1, 0)) || vector.equals(new Communicator.Point3(0, -1, 0))) {
            sectionId = 1;
        }          
        else if (vector.equals(new Communicator.Point3(0, 0, 1)) || vector.equals(new Communicator.Point3(0, 0, -1))) {
            sectionId = 2;
        }

        return sectionId;
    }

    createCuttingSection(targetDir, vector, position, box, parcent) {
        const sectionId = this._vector2SectionId(targetDir);

        let referenceGeometry = this._createReferenceGeometry(vector, box, position, parcent);
        this._orgReferenceGeometryArr[sectionId] = referenceGeometry;
        this._currentReferenceGeometryArr[sectionId] = referenceGeometry;

        let horizontalVector;
        let p0 = referenceGeometry[0].copy();
        let p1 = referenceGeometry[1].copy();
        let p2 = referenceGeometry[2].copy();

        p2 = p2.subtract(p0).scale(0.5);
        const center = p0.copy().add(p2);

        p1 = p1.subtract(p0).scale(0.5);
        const h = p0.copy().add(p1);
        horizontalVector = h.subtract(center);
        horizontalVector.normalize();

        // create plane for cutting plane
        let plane = Communicator.Plane.createFromPointAndNormal(position, vector);
        this._planeArr[sectionId] = plane;

        // get cuting section and activate
        let cuttingSection;

        if (this._isSectioning) {
            cuttingSection = this._viewer.cuttingManager.getCuttingSection(3);
            this._sectionIdArr.push(sectionId);
        }
        else {
            cuttingSection = this._viewer.cuttingManager.getCuttingSection(sectionId);
        }

        if (this._isShowSections) {
            cuttingSection.addPlane(plane, referenceGeometry);
        }
        else {
            cuttingSection.addPlane(plane);
        }

        // Activate cuttein section
        cuttingSection.activate();

        this._vector = vector;
        this._box = box;

        return this.getPositionPercent(targetDir, plane);
    }

    rotateCuttingSection(targetDir, vector, position, matrix) {
        const sectionId = this._vector2SectionId(targetDir);

        let referenceGeometry = Array.from(this._orgReferenceGeometryArr[sectionId]);
        for (let i = 0; i < referenceGeometry.length; i++) {
            let point = referenceGeometry[i];
            referenceGeometry[i] = matrix.transform(point);
            this._currentReferenceGeometryArr[sectionId] = referenceGeometry;
        }

        // create plane for cutting plane
        let plane = Communicator.Plane.createFromPointAndNormal(position, vector);
        this._planeArr[sectionId] = plane;

        if (this._isSectioning) {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(3);
            for (let i = 0; i < cuttingSection.getCount(); i++) {
                if (sectionId ==  this._sectionIdArr[i]) {
                    cuttingSection.removePlane(i);
                    cuttingSection.addPlane(plane, referenceGeometry);
                }
            }
        }
        else {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(sectionId);
            if (cuttingSection.isActive()) {
                cuttingSection.removePlane(0).then(() => {
                    cuttingSection.addPlane(plane, referenceGeometry);
                });
            }
        }
    }

    deleteCuttingSection(vector) {
        const sectionId = this._vector2SectionId(vector);
        this._planeArr[sectionId] = undefined;
        this._orgReferenceGeometryArr[sectionId] = undefined;
        this._currentReferenceGeometryArr[sectionId] = undefined;

        if (this._isSectioning) {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(3);
            for (let i = 0; i < cuttingSection.getCount(); i++) {
                const plane = cuttingSection.getPlane(i);
                if (sectionId == this._sectionIdArr[i]) {
                    let normal = plane.normal;
                    cuttingSection.removePlane(i);
                    this._sectionIdArr.splice(i, 1);
                    return normal;
                }
            }
        }
        else {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(sectionId);
            if (cuttingSection.isActive()) {
                const plane = cuttingSection.getPlane(0);
                let normal = plane.normal;
                cuttingSection.clear();
                return normal;
            }
        }

    }

    flipCuttingSection(vector) {
        const sectionId = this._vector2SectionId(vector);
        if (this._isSectioning) {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(3);
            for (let i = 0; i < cuttingSection.getCount(); i++) {
                let plane = cuttingSection.getPlane(i);
                if (sectionId ==  this._sectionIdArr[i]) {
                    plane.normal.set(-plane.normal.x, -plane.normal.y, -plane.normal.z);
                    plane.d = -plane.d;
                    this._planeArr[sectionId] = plane;
                    cuttingSection.updatePlane(i, plane);
                }
            }
        }
        else {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(sectionId);
            if (cuttingSection.isActive()) {
                let plane = cuttingSection.getPlane(0);
                plane.normal.set(-plane.normal.x, -plane.normal.y, -plane.normal.z);
                plane.d = -plane.d;
                this._planeArr[sectionId] = plane;
                cuttingSection.updatePlane(0, plane);
            }
        }
    }

    deleteAllCuttingSections() {
        return new Promise((resolve, reject) => {
            this._viewer.cuttingManager.deactivateCuttingSections(true).then(() => {
                this._isSectioning = false;
                this._isShowSections = true;
                this._planeArr = new Array(3);
                this._orgReferenceGeometryArr = new Array(3);
                this._currentReferenceGeometryArr = new Array(3);
                this._sectionIdArr.length = 0;
                return resolve();
            });
        });
    }

    showReferenceGeometry(show) {
        if (this._isSectioning) {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(3);
            cuttingSection.clear().then(() => {
                let promiseArr = new Array(0);
                for (let i = 0; i < 3; i++) {
                    if (undefined != this._planeArr[i]) {
                        if (show) {
                            promiseArr.push(cuttingSection.addPlane(this._planeArr[i], this._currentReferenceGeometryArr[i]));
                        }
                        else {
                            promiseArr.push(cuttingSection.addPlane(this._planeArr[i]));
                        }
                    }
                }

                Promise.all(promiseArr).then(() => {
                    cuttingSection.activate();
                })
            });
        }
        else {
            for (let i = 0; i < 3; i++) {
                if(undefined != this._planeArr[i]) {
                    let cuttingSection = this._viewer.cuttingManager.getCuttingSection(i);
                    cuttingSection.removePlane(0).then(() => {
                        if (show) {
                                cuttingSection.addPlane(this._planeArr[i], this._currentReferenceGeometryArr[i]);
                        }
                        else {
                                cuttingSection.addPlane(this._planeArr[i]);
                        }
                    });
                }
            }
        }
        this._isShowSections = show;
    }

    resizeReferenceGeomatry(parcent) {
        const box = this._box;
        const vector = this._vector;
        let referenceGeometry = this._createReferenceGeometry(vector, box, parcent);

        let cuttingSection = this._viewer.cuttingManager.getCuttingSection(0);
        const plane = cuttingSection.getPlane(0);
        cuttingSection.removePlane(0);
        cuttingSection.addPlane(plane, referenceGeometry);
    }

    slideCuttingPlane(vector, gain, reverse) {
        const sectionId = this._vector2SectionId(vector);
        if (this._isSectioning) {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(3);
            if (cuttingSection.isActive()) {
                for (let i = 0; i < cuttingSection.getCount(); i++) {
                    let plane = cuttingSection.getPlane(i);
                    if (sectionId == this._sectionIdArr[i]) {
                        let matrix = new Communicator.Matrix();
                        let distance = 0;
                        if (0 == sectionId) {
                            distance = gain * -(this._box.max.x - this._box.min.x) / 100 * reverse;
                            matrix.setTranslationComponent(-distance * plane.normal.x, 0, 0);
                        } else if (1 == sectionId) {
                            distance = gain * -(this._box.max.y - this._box.min.y) / 100 * reverse;
                            matrix.setTranslationComponent(0, -distance * plane.normal.y, 0);
                        } else if (2 == sectionId) {
                            distance = gain * -(this._box.max.z - this._box.min.z) / 100 * reverse;
                            matrix.setTranslationComponent(0, 0, -distance * plane.normal.z);
                        }
                        plane.d += distance;
                        cuttingSection.updatePlane(i, plane, matrix, true, false);

                        this._planeArr[sectionId] = plane;

                        return matrix;
                    }
                }
            }
        }
        else {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(sectionId);
            if (cuttingSection.isActive()) {
                let plane = cuttingSection.getPlane(0);
    
                let distance = 0;
                if (0 == sectionId) {
                    distance = gain * -(this._box.max.x - this._box.min.x) / 100 * reverse;
                } else if (1 == sectionId) {
                    distance = gain * -(this._box.max.y - this._box.min.y) / 100 * reverse;
                } else if (2 == sectionId) {
                    distance = gain * -(this._box.max.z - this._box.min.z) / 100 * reverse;
                }
                plane.d += distance;

                let matrix = new Communicator.Matrix();
                matrix.setTranslationComponent(-distance * plane.normal.x, -distance * plane.normal.y, -distance * plane.normal.z);    
                
                cuttingSection.updatePlane(0, plane, matrix, true, false);
    
                this._planeArr[sectionId] = plane;

                return matrix;
            }
        }

    }

    sectioning(on) {
        if (on) {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(3);
            let promiseArr = new Array(0);
            for (let i = 0; i < 3; i++) {
                if (undefined != this._planeArr[i]) {
                    this._sectionIdArr.push(i);
                    let geom = null;
                    if (this._isShowSections) {
                        geom = this._currentReferenceGeometryArr[i];
                    }
                    promiseArr.push(cuttingSection.addPlane(this._planeArr[i], geom));
                    promiseArr.push(this._viewer.cuttingManager.getCuttingSection(i).deactivate());
                    promiseArr.push(this._viewer.cuttingManager.getCuttingSection(i).clear());
                }
            }

            if (promiseArr.length) {
                Promise.all(promiseArr).then(() => {
                    cuttingSection.activate();
                })
            }
        }
        else {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(3);
            let promiseArr = new Array(0);
            promiseArr.push(this._viewer.cuttingManager.getCuttingSection(3).deactivate());
            promiseArr.push(this._viewer.cuttingManager.getCuttingSection(3).clear());
            this._sectionIdArr.length = 0;

            for (let i = 0; i < 3; i++) {
                if (undefined != this._planeArr[i]) {
                    let cuttingSection = this._viewer.cuttingManager.getCuttingSection(i);
                    let geom = null;
                    if (this._isShowSections) {
                        geom = this._currentReferenceGeometryArr[i];
                    }
                    promiseArr.push(cuttingSection.addPlane(this._planeArr[i], geom));
                }
            }

            if (promiseArr.length) {
                Promise.all(promiseArr).then(() => {
                    for (let i = 0; i < 3; i++) {
                        if (undefined != this._planeArr[i]) {
                            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(i);
                            cuttingSection.activate();
                        }
                    }
                })
            }
        }
        this._isSectioning = on;
    }

    getPositionPercent(targetDir, plane) {
        let percent = 0;
        if (targetDir.equals(new Communicator.Point3(1, 0, 0)) || targetDir.equals(new Communicator.Point3(-1, 0, 0))) {
            const range = this._box.max.x - this._box.min.x;
            const center = this._box.min.x + range / 2;
            percent = 50 + (-plane.d * plane.normal.x - center) / range * 100;
        }
        else if (targetDir.equals(new Communicator.Point3(0, 1, 0)) || targetDir.equals(new Communicator.Point3(0, -1, 0))) {
            const range = this._box.max.y - this._box.min.y;
            const center = this._box.min.y + range / 2;
            percent = 50 + (-plane.d * plane.normal.y - center) / range * 100;
        }
        else if (targetDir.equals(new Communicator.Point3(0, 0, 1)) || targetDir.equals(new Communicator.Point3(0, 0, -1))) {
            const range = this._box.max.z - this._box.min.z;
            const center = this._box.min.z + range / 2;
            percent = 50 + (-plane.d * plane.normal.z - center) / range * 100;
        }
        return percent;
    }

    getDistancePercent(vector, distance) {
        let percent = 0;
        if (vector.equals(new Communicator.Point3(1, 0, 0)) || vector.equals(new Communicator.Point3(-1, 0, 0))) {
            const range = this._box.max.x - this._box.min.x;
            percent = distance / range * 100;
        }
        else if (vector.equals(new Communicator.Point3(0, 1, 0)) || vector.equals(new Communicator.Point3(0, -1, 0))) {
            const range = this._box.max.y - this._box.min.y;
            percent = distance / range * 100;
        }
        else if (vector.equals(new Communicator.Point3(0, 0, 1)) || vector.equals(new Communicator.Point3(0, 0, -1))) {
            const range = this._box.max.z - this._box.min.z;
            percent = distance / range * 100;
        }
        return percent;
    }

    getSectionId(targetNormal) {
        if (this._isSectioning) {
            let cuttingSection = this._viewer.cuttingManager.getCuttingSection(3);
            for (let i = 0; i < cuttingSection.getCount(); i++) {
                let plane = cuttingSection.getPlane(i);
                if (plane.normal.equals(targetNormal)) {
                    return this._sectionIdArr[i];
                }
            }
        }
        else {
            for (let i = 0; i < 3; i++) {
                let cuttingSection = this._viewer.cuttingManager.getCuttingSection(i);
                let plane = cuttingSection.getPlane(0);
                if (plane.normal.equals(targetNormal)) {
                    return i;
                }
            }
        }
    }
}