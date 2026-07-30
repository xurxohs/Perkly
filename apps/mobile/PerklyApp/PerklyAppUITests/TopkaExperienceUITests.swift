import XCTest

final class TopkaExperienceUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-topka-ui-test"]
        app.launch()
    }

    func testHeroTapOriginsAndInteractiveDetailReveal() throws {
        let card = element(identifier: "topka.photoCard.demo-neon-garden")
        XCTAssertTrue(card.waitForExistence(timeout: 6))
        XCTAssertTrue(card.isHittable)
        attachScreenshot(named: "01-photo-preview")

        card.coordinate(
            withNormalizedOffset: CGVector(dx: 0.18, dy: 0.2)
        )
        .tap()

        let detail = element(identifier: "topka.photoDetail")
        XCTAssertTrue(detail.waitForExistence(timeout: 3))
        XCTAssertTrue(waitForHittability(detail, timeout: 3))
        XCTAssertTrue(waitForValue("resting.detail", of: detail, timeout: 3))
        attachScreenshot(named: "02-detail-from-upper-left")

        let backButton = app.buttons
            .matching(identifier: "topka.detail.back")
            .firstMatch
        XCTAssertTrue(backButton.waitForExistence(timeout: 2))
        XCTAssertTrue(waitForHittability(backButton, timeout: 2))
        backButton.tap()

        XCTAssertTrue(waitForNonexistence(detail, timeout: 3))
        XCTAssertTrue(waitForHittability(card, timeout: 3))

        card.coordinate(
            withNormalizedOffset: CGVector(dx: 0.82, dy: 0.78)
        )
        .tap()

        XCTAssertTrue(detail.waitForExistence(timeout: 3))
        XCTAssertTrue(waitForHittability(detail, timeout: 3))
        XCTAssertTrue(waitForValue("resting.detail", of: detail, timeout: 3))
        attachScreenshot(named: "03-detail-from-lower-right")

        let expandedDetails = element(identifier: "topka.expandedDetails")
        let swipeIndicator = element(identifier: "topka.detail.swipeIndicator")
        XCTAssertFalse(expandedDetails.exists)
        XCTAssertTrue(swipeIndicator.waitForExistence(timeout: 2))

        let shortDragStart = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.5, dy: 0.42)
        )
        let shortDragEnd = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)
        )
        shortDragStart.press(
            forDuration: 0.1,
            thenDragTo: shortDragEnd,
            withVelocity: .slow,
            thenHoldForDuration: 0.1
        )

        XCTAssertFalse(expandedDetails.waitForExistence(timeout: 1))
        XCTAssertTrue(waitForValue("resting.detail", of: detail, timeout: 2))
        XCTAssertTrue(swipeIndicator.waitForExistence(timeout: 2))
        attachScreenshot(named: "04-incomplete-drag-cancelled")

        let fullDragStart = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.5, dy: 0.72)
        )
        let fullDragEnd = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.5, dy: 0.31)
        )
        fullDragStart.press(
            forDuration: 0.08,
            thenDragTo: fullDragEnd,
            withVelocity: .slow,
            thenHoldForDuration: 0.08
        )

        XCTAssertTrue(expandedDetails.waitForExistence(timeout: 3))
        XCTAssertTrue(waitForValue("resting.expanded", of: detail, timeout: 3))

        let shareButton = app.buttons
            .matching(identifier: "topka.detail.share")
            .firstMatch
        let squadButton = app.buttons
            .matching(identifier: "topka.detail.sendToSquad")
            .firstMatch
        XCTAssertTrue(shareButton.waitForExistence(timeout: 2))
        XCTAssertTrue(squadButton.waitForExistence(timeout: 2))
        XCTAssertTrue(waitForHittability(shareButton, timeout: 2))
        XCTAssertTrue(waitForHittability(squadButton, timeout: 2))
        XCTAssertTrue(shareButton.isEnabled)
        XCTAssertTrue(squadButton.isEnabled)
        attachScreenshot(named: "05-expanded-details")
    }

    func testVerticalSwipeBackCancelsThenDismisses() throws {
        let card = element(identifier: "topka.photoCard.demo-neon-garden")
        XCTAssertTrue(card.waitForExistence(timeout: 6))
        card.tap()

        let detail = element(identifier: "topka.photoDetail")
        XCTAssertTrue(detail.waitForExistence(timeout: 2))
        XCTAssertTrue(waitForValue("resting.detail", of: detail, timeout: 3))

        let shortStart = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.5, dy: 0.36)
        )
        let shortEnd = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.5, dy: 0.43)
        )
        shortStart.press(
            forDuration: 0.08,
            thenDragTo: shortEnd,
            withVelocity: .slow,
            thenHoldForDuration: 0.12
        )

        XCTAssertTrue(waitForValue("resting.detail", of: detail, timeout: 2))

        let dismissEnd = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.5, dy: 0.82)
        )
        shortStart.press(
            forDuration: 0.05,
            thenDragTo: dismissEnd,
            withVelocity: .fast,
            thenHoldForDuration: 0
        )

        XCTAssertTrue(waitForNonexistence(detail, timeout: 3))
        XCTAssertTrue(waitForHittability(card, timeout: 3))
    }

    func testLeadingEdgeSwipeBackDismissesDetail() throws {
        let card = element(identifier: "topka.photoCard.demo-neon-garden")
        XCTAssertTrue(card.waitForExistence(timeout: 6))
        card.tap()

        let detail = element(identifier: "topka.photoDetail")
        XCTAssertTrue(detail.waitForExistence(timeout: 2))
        XCTAssertTrue(waitForValue("resting.detail", of: detail, timeout: 3))

        let edge = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.015, dy: 0.46)
        )
        let destination = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.76, dy: 0.46)
        )
        edge.press(
            forDuration: 0.04,
            thenDragTo: destination,
            withVelocity: .fast,
            thenHoldForDuration: 0
        )

        XCTAssertTrue(waitForNonexistence(detail, timeout: 3))
        XCTAssertTrue(waitForHittability(card, timeout: 3))
    }

    func testTouchCanHoldAndReverseOpeningMotion() throws {
        let card = element(identifier: "topka.photoCard.demo-neon-garden")
        XCTAssertTrue(card.waitForExistence(timeout: 6))
        card.tap()

        let detail = element(identifier: "topka.photoDetail")
        XCTAssertTrue(detail.waitForExistence(timeout: 1))

        let grabPoint = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.5, dy: 0.44)
        )
        grabPoint.press(forDuration: 0.18)
        XCTAssertTrue(waitForValue("resting.detail", of: detail, timeout: 3))

        let dismissPoint = app.coordinate(
            withNormalizedOffset: CGVector(dx: 0.5, dy: 0.88)
        )
        grabPoint.press(
            forDuration: 0,
            thenDragTo: dismissPoint,
            withVelocity: .fast,
            thenHoldForDuration: 0
        )

        XCTAssertTrue(waitForNonexistence(detail, timeout: 3))
        XCTAssertTrue(waitForHittability(card, timeout: 3))
    }

    private func element(identifier: String) -> XCUIElement {
        app.descendants(matching: .any)
            .matching(identifier: identifier)
            .firstMatch
    }

    private func waitForNonexistence(
        _ element: XCUIElement,
        timeout: TimeInterval
    ) -> Bool {
        let predicate = NSPredicate(format: "exists == false")
        let expectation = XCTNSPredicateExpectation(
            predicate: predicate,
            object: element
        )
        return XCTWaiter.wait(
            for: [expectation],
            timeout: timeout
        ) == .completed
    }

    private func waitForHittability(
        _ element: XCUIElement,
        timeout: TimeInterval
    ) -> Bool {
        let predicate = NSPredicate(format: "exists == true AND hittable == true")
        let expectation = XCTNSPredicateExpectation(
            predicate: predicate,
            object: element
        )
        return XCTWaiter.wait(
            for: [expectation],
            timeout: timeout
        ) == .completed
    }

    private func waitForValue(
        _ value: String,
        of element: XCUIElement,
        timeout: TimeInterval
    ) -> Bool {
        let predicate = NSPredicate(format: "value == %@", value)
        let expectation = XCTNSPredicateExpectation(
            predicate: predicate,
            object: element
        )
        return XCTWaiter.wait(
            for: [expectation],
            timeout: timeout
        ) == .completed
    }

    private func attachScreenshot(named name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
