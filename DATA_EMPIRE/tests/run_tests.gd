## Headless test runner.
##
## Windows (PowerShell), from the DATA_EMPIRE folder:
##   godot --headless --path . -s res://tests/run_tests.gd
## or simply:  .\tools\run_tests.ps1   (also fails on any "SCRIPT ERROR" in the output)
##
## Exit code 0 = all tests passed, 1 = at least one failure.
extends SceneTree

const TEST_DIR := "res://tests"


func _initialize() -> void:
	var files := _find_suites()
	var total := 0
	var failed := 0
	print("DATA EMPIRE — test runner (%d suite(s))" % files.size())
	for path in files:
		var script := load(path) as GDScript
		if script == null:
			printerr("  [ERROR] cannot load %s" % path)
			failed += 1
			continue
		var suite = script.new()
		suite.tree = self
		for method in script.get_script_method_list():
			var method_name: String = method["name"]
			if not method_name.begins_with("test_"):
				continue
			total += 1
			suite.begin_test(method_name)
			suite.before_each()
			suite.call(method_name)
			suite.after_each()
			var errors: Array[String] = suite.end_test()
			if errors.is_empty():
				print("  [PASS] %s :: %s" % [path.get_file(), method_name])
			else:
				failed += 1
				for error in errors:
					printerr("  [FAIL] %s :: %s — %s" % [path.get_file(), method_name, error])
	print("Result: %d test(s), %d passed, %d failed" % [total, total - failed, failed])
	quit(1 if failed > 0 else 0)


func _find_suites() -> Array[String]:
	var suites: Array[String] = []
	var dir := DirAccess.open(TEST_DIR)
	if dir == null:
		printerr("Cannot open %s" % TEST_DIR)
		return suites
	for file_name in dir.get_files():
		if file_name.begins_with("test_") and file_name.ends_with(".gd"):
			suites.append(TEST_DIR + "/" + file_name)
	suites.sort()
	return suites
