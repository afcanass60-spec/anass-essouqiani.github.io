## TestCase — tiny assertion base class for the headless runner (no addon needed).
##
## A suite is any `res://tests/test_*.gd` extending this file. Every method whose
## name starts with `test_` is a test. A test that makes no assertion is reported
## as a failure, so a test aborted by a script error can't pass silently.
extends RefCounted

var tree: SceneTree

var _current_test := ""
var _errors: Array[String] = []
var _assertions := 0


func before_each() -> void:
	pass


func after_each() -> void:
	pass


func begin_test(test_name: String) -> void:
	_current_test = test_name
	_errors.clear()
	_assertions = 0


func end_test() -> Array[String]:
	if _assertions == 0 and _errors.is_empty():
		_errors.append("no assertion executed (script error before the first assert?)")
	return _errors.duplicate()


func assert_true(condition: bool, message: String = "") -> void:
	_assertions += 1
	if not condition:
		_errors.append("expected true. %s" % message)


func assert_false(condition: bool, message: String = "") -> void:
	assert_true(not condition, message)


func assert_eq(actual: Variant, expected: Variant, message: String = "") -> void:
	_assertions += 1
	if typeof(actual) != typeof(expected) or actual != expected:
		_errors.append("expected <%s>, got <%s>. %s" % [str(expected), str(actual), message])


func assert_almost(actual: float, expected: float, tolerance: float = 0.001, message: String = "") -> void:
	_assertions += 1
	if absf(actual - expected) > tolerance:
		_errors.append("expected %f ± %f, got %f. %s" % [expected, tolerance, actual, message])


func assert_not_null(value: Variant, message: String = "") -> void:
	_assertions += 1
	if value == null:
		_errors.append("expected a non-null value. %s" % message)
