const { getBrowserPage } = require("./browser");
const cheerio = require("cheerio");

//create function for login to lms using cookie
const loginWithCookie = async (cookie) => {
  try {
    //dashboard url
    const url = "https://oulms.ou.ac.lk/my/";

    //open browser page
    const { page } = await getBrowserPage();

    //set the session cookie in oulms base domain
    await page.setCookie({
      name: "MoodleSession",
      value: cookie,
      domain: "oulms.ou.ac.lk",
      path: "/",
      httpOnly: true,
      secure: true,
    });

    //load the given url
    const loggedIn = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    console.log("Current URL:", page.url());
    if (page.url().includes("login")) {
      throw new Error("Invalid or expired MoodleSession cookie");
    }

    if (loggedIn) {
      console.log("Logged in");
    } else {
      console.log("Login failed");
    }

    //return page to reuse
    return page;
  } catch (error) {
    console.error("Login error: ".error);
    return false;
  }
};

//create function for get courses in dashboard
const getCourses = async (page) => {
  try {
    //dashboard url
    const url = "https://oulms.ou.ac.lk/my/";

    //load dashboard url
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    //wait until courses load
    await page.waitForSelector("a.coursename", { timeout: 20000 });

    //get the page HTML content
    const html = await page.content();

    //initialize cheerio
    const $ = cheerio.load(html);

    //list of courses
    const courses = [];

    //extract courses urls
    $("a.coursename").each((i, el) => {
      const courseUrl = $(el).attr("href");
      const courseName = $(el)
        .contents()
        .filter(function () {
          return this.type === "text";
        })
        .text()
        .trim();
      if (courseUrl || courseName) {
        courses.push({ courseName, courseUrl });
      }
    });

    return { page, courses };
  } catch (error) {
    console.error("Get courses error: ", error);
  }
};

//create function to navigate inside to each course and return each course announcements
const getCourseAnnouncements = async (courses, page) => {
  //initialize all courses announcements
  const allCoursesAnnouncements = [];

  try {
    //get each courses
    for (const course of courses) {
      //get name and link from each course
      const { courseName, courseUrl } = course;

      //extract course id
      const courseId = courseUrl.split("=").pop();

      //extract course code
      const courseCode = courseName.slice(0, 7);

      //extract course title
      const courseTitle = courseName.slice(8);

      //goto course inside
      await page.goto(courseUrl, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      //wait until announcement load
      await page.waitForSelector("a.aalink.stretched-link", { timeout: 20000 });

      //get the page HTML content
      const courseHtml = await page.content();

      //initialize cheerio
      let $ = cheerio.load(courseHtml);

      //initialize announcements url
      let announcementsUrl;

      //initialize course communication url
      let courseCommunicationUrl;

      //extract announcements url
      $("a.aalink.stretched-link").each((i, el) => {
        const spanText = $(el).find("span.instancename").text().trim();

        //check it announcement or not
        if (spanText.includes("Announcements")) {
          announcementsUrl = $(el).attr("href");
        }
      });

      //if announcement not in it get the course communication url
      if (!announcementsUrl) {
        $("a.grid-section-inner").each((i, el) => {
          const divText = $(el)
            .find("div.card-header.text-truncate")
            .text()
            .trim();

          //check it course communication or not
          if (divText.includes("Course Communication")) {
            courseCommunicationUrl = $(el).attr("href");
          }
        });
      }

      //goto course communication inside if it hasnt announcement
      if (!announcementsUrl) {
        //goto course communication inside
        await page.goto(courseCommunicationUrl, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });

        //wait until communication load
        await page.waitForSelector("a.aalink.stretched-link", {
          timeout: 20000,
        });

        //get the page HTML content
        const communicationHtml = await page.content();

        //initialize cheerio
        $ = cheerio.load(communicationHtml);

        //extract announcements url
        $("a.aalink.stretched-link").each((i, el) => {
          const spanText = $(el).find("span.instancename").text().trim();

          //check it announcement or not
          if (spanText.includes("Announcements")) {
            announcementsUrl = $(el).attr("href");
          }
        });
      }

      //innitialize announcements list
      const announcements = [];

      //innitialize announcement url list
      const titleUrls = [];

      //go announcement inside
      await page.goto(announcementsUrl, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      //wait until announcements load
      await page.waitForSelector("a.w-100.h-100.d-block", {
        timeout: 20000,
      });

      //get the page HTML content
      const anouncmentsHtml = await page.content();

      //initialize cheerio
      $ = cheerio.load(anouncmentsHtml);

      //extract announcements url
      $("a.w-100.h-100.d-block").each((i, el) => {
        const titleUrl = $(el).attr("href");

        if (titleUrl) {
          titleUrls.push(titleUrl);
        }
      });

      if (titleUrls.length > 0) {
        //goto each announcement title inside
        for (const titleUrl of titleUrls) {
          //go announcement title inside
          await page.goto(titleUrl, {
            waitUntil: "networkidle2",
            timeout: 60000,
          });

          //wait until announcement info load
          await page.waitForSelector("h3.discussionname", {
            timeout: 20000,
          });

          //get the page HTML content
          const anouncmentInfoHtml = await page.content();

          //initialize cheerio
          $ = cheerio.load(anouncmentInfoHtml);

          //extract announcement info
          const title = $("h3.discussionname").text().trim();
          const description = $("div.post-content-container p")
            .map((i, el) => $(el).text().trim())
            .get()
            .filter((text) => text.length > 0)
            .join("\n");
          const announcer = $("div.mb-3 a").text().trim();
          const time = $("div.mb-3 time").text().trim();

          if ((title, description, announcer, time)) {
            announcements.push({ title, description, announcer, time });
          }
        }
      }

      allCoursesAnnouncements.push({
        courseId,
        courseCode,
        courseTitle,
        announcements,
      });
    }

    return allCoursesAnnouncements;
  } catch (error) {
    console.error("Get course announcements error: ", error);
    return false;
  }
};

module.exports = { loginWithCookie, getCourses, getCourseAnnouncements };
