var properties = function (project_settings) {
	var return_value = [];
	
	var materialDimensions = project_settings.material.dimensions;
	
	if (project_settings.preferredUnit == 'mm') {
		materialDimensions.x = Math.round( ( materialDimensions.x * 25.4 ) * 10 ) / 10;
		materialDimensions.y = Math.round( ( materialDimensions.y * 25.4 ) * 10 ) / 10;
		materialDimensions.z = Math.round( ( materialDimensions.z * 25.4 ) * 10 ) / 10;
	}
	
	if (project_settings.preferredUnit == 'mm') {
		// Millimeters.
		return [
			{type: 'text', id: "Number of plugs", value: 1 },
			{type: 'text', id: "Plug diameter", value: 10 },
			{type: 'text', id: "Plug depth", value: Math.round( (materialDimensions.z - 5 ) * 100) / 100},
		];
	}
	else {
		// Inches
		return [
			{type: 'text', id: "Number of plugs", value: 1 },
			{type: 'text', id: "Plug diameter", value: 0.5 },
			{type: 'text', id: "Plug depth", value: Math.round( (materialDimensions.z - .1 ) * 100) / 100 },
		];
	}
};

var executor = function(args, success, failure) {
	var params = args.params;

	params['Number of plugs'] = parseInt(params['Number of plugs'], 10);
	params['Plug diameter'] = parseFloat(params['Plug diameter']);
	params['Plug depth'] = parseFloat(params['Plug depth']);

	if (isNaN(params['Plug depth'])){
		failure("Invalid plug depth.");
		return;
	}

	if (isNaN(params['Plug depth']) || params['Plug depth'] <= 0) {
		failure("Plug depth must be greater than zero.");
		return;
	}

	if (args.preferredUnit == 'mm') {
		params['Plug depth'] /= 25.4;
	}

	if (isNaN(params['Number of plugs']) || params['Number of plugs'] < 1) {
		failure("You must create at least one plug.");
		return;
	}
	
	if (isNaN(params['Plug diameter'] ) || params['Plug diameter'] <= 0) {
		failure("Plug diameter must be greater than zero.");
		return;
	}
	
	if (args.preferredUnit == 'mm') {
		params['Plug diameter'] /= 25.4;
	}
	
	var materialDimensions = args.material.dimensions;

	if (materialDimensions.z <= params['Plug depth']) {
		failure("Plug depth exceeds material thickness.");
		return;
	}
	
	// Use the smallest available bit.
	var bit = args.bitParams.bit;
	
	if (args.bitParams.useDetailBit) {
		bit = args.bitParams.detailBit;
	}
	
	// All of the exported volumes are expected to use inches, so if the bit
	// is specified in mm, convert it here.
	var bitWidth = bit.width;
	
	if (bit.unit == 'mm') {
		bitWidth /= 25.4;
	}
	
	// Always treat the bit as if it's a tiny bit bigger than it actually is so
	// that no part of the design is uncarveable, since it appears that Easel
	// will sometimes not generate a toolpath if the pocket is exactly the same
	// size as the bit.
	bitWidth += 0.01;

	var outer_diameter = params['Plug diameter'] + (bitWidth * 2);
	var inner_diameter = params['Plug diameter'];
	
	var volumes = [];
	var x_center = (outer_diameter / 2);
	var y_center = (outer_diameter / 2);
	
	// The distance between centers.
	var plug_offset = outer_diameter - bitWidth;
	
	for (var i = 0; i < params['Number of plugs']; i++){
		if ((y_center + plug_offset) > materialDimensions.y) {
			failure("Your material is not large enough to hold that many plugs.");
			return;
		}

		volumes.push({
			shape: {
				type: "ellipse",
				center: {
					x: x_center,
					y: y_center
				},
				width: outer_diameter,
				height: outer_diameter,
				// These two properties are unused, but Easel breaks if you don't include them.
				// @see https://discuss.inventables.com/t/bug-easel-runs-my-executor-code-hundreds-of-times-per-second/42921/2
				flipping: {},
				rotation: 0,
			},
			cut: {
				depth: params['Plug depth'],
				type: 'fill',
			}
		});
		
		volumes.push({
			shape: {
				type: "ellipse",
				center: {
					x: x_center,
					y: y_center,
				},
				width: inner_diameter,
				height: inner_diameter,
				// These two properties are unused, but Easel breaks if you don't include them.
				// @see https://discuss.inventables.com/t/bug-easel-runs-my-executor-code-hundreds-of-times-per-second/42921/2
				flipping: {},
				rotation: 0,
			},
			cut: {
				depth: 0,
				type: 'fill',
			}
		});

		/*
		// We could do this with a single volume per plug by using an outline cut,
		// but the preview doesn't accurately reflect the cutting that will take place.
		volumes.push({
			shape: {
				type: "ellipse",
				center: {
					x: x_center,
					y: y_center,
				},
				width: inner_diameter,
				height: inner_diameter,
				// These two properties are unused, but Easel breaks if you don't include them.
				// @see https://discuss.inventables.com/t/bug-easel-runs-my-executor-code-hundreds-of-times-per-second/42921/2
				flipping: {},
				rotation: 0,
			},
			cut: {
				depth: params['Plug depth'],
				type: 'outline',
				outlineStyle: 'outside',
			}
		});
		*/
		
		// Set the location of the next plug.
		x_center += plug_offset;
		
		// If the next plug overflows the material, move up a line.
		if ((x_center + plug_offset) > materialDimensions.x) {
			y_center += plug_offset;
			x_center = (outer_diameter / 2);
		}
	}

	if (volumes.length > 0){
		// Easel doesn't like it when you send it an empty volume set.
		success(volumes);
	}
	
	return;
};
