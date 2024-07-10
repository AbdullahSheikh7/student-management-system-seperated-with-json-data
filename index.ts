#!/usr/bin/env node

import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import chalk from "chalk";
import chalkAnimation from "chalk-animation";
import Table from "cli-table";
import figlet, { text } from "figlet";
import inquirer from "inquirer";
import gradientString from "gradient-string";
import { createSpinner, Spinner } from "nanospinner";
import Choices from "inquirer/lib/objects/choices.js";

class Student {
  sname: string;
  class: string;
  rollNo: string;
  courses: string[];
  fees: number;
  feePaid: boolean;

  constructor(
    studentName: string,
    studentClass: string,
    studentRollNo: string,
    studentCourses: string[]
  ) {
    this.sname = studentName;
    this.class = studentClass;
    this.rollNo = studentRollNo;
    this.courses = studentCourses;
    this.fees = this.courses.length * 100;
    this.feePaid = false;
  }

  addToJSON(studentsJSONPath: string) {
    let studentsObject = JSON.parse(
      fs.readFileSync(studentsJSONPath).toString()
    );
    console.log(studentsObject);
    let studentsIds = Object.keys(studentsObject);

    let uniqueRandomId: string;
    do {
      uniqueRandomId = Math.floor(Math.random() * 99999)
        .toString()
        .padStart(5, "0");
    } while (studentsIds.includes(uniqueRandomId));

    studentsObject[uniqueRandomId] = {
      name: this.sname,
      class: this.class,
      rollNo: this.rollNo,
      courses: this.courses,
      fees: this.fees,
      feePaid: this.feePaid,
    };

    fs.writeFileSync(studentsJSONPath, JSON.stringify(studentsObject));
  }
}

const sleep = async (ms: number = 2000) => {
  await new Promise((r) => {
    setTimeout(r, ms);
  });
};

const addStudent = async (studentsJSONPath: string) => {
  let spinner = createSpinner("Please wait...");
  let courses: string[] = Array.from(
    JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data/courses.json")).toString()
    )
  );

  if (Object.keys(JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/students.json")).toString())).length >= 99999) {
    console.log(`${chalk.green("?")} The students has reached it's limit. Cannot add more students\n`)
    return;
  }

  let input = await inquirer.prompt([
    {
      name: "studentName",
      type: "input",
      message: "Student name:",
      validate(value) {
        if (/\W|\d/.test(value) || value == "") {
          return "Please provide a valid name";
        } else {
          return true;
        }
      },
    },
    {
      name: "studentClass",
      type: "input",
      message: "Student class:",
      validate(value) {
        if (/\D/.test(value) || value == "") {
          return "Please provide class number";
        } else {
          return true;
        }
      },
    },
    {
      name: "studentRollNo",
      type: "input",
      message: "Student roll no:",
      validate(value) {
        if (/[\D]/.test(value) || value.length !== 5) {
          return "Please provide a 5 digits roll no.";
        } else {
          return true;
        }
      },
    },
    {
      name: "studentEnrolledCourses",
      type: "checkbox",
      message: "Student enrolled courses",
      choices: courses,
    },
    {
      name: "confirmAddingStudent",
      type: "confirm",
      message: "Confirm adding student?",
    },
  ]);

  spinner.start();
  await sleep();

  if (input.confirmAddingStudent) {
    let student = new Student(
      input.studentName,
      input.studentClass,
      input.studentRollNo,
      input.studentEnrolledCourses
    );
    student.addToJSON(studentsJSONPath);
    spinner.success({ text: "Student added successfully\n" });
  } else {
    spinner.error({ text: "Student not added\n" });
  }
};

const enrollStudent = async (studentsJSONPath: string) => {
  let spinner = createSpinner("Please wait...");
  let studentsObject = JSON.parse(fs.readFileSync(studentsJSONPath).toString());
  let studentsNames = Object.keys(studentsObject).map(
    (e) => studentsObject[e].name
  );
  let courses: string[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/courses.json")).toString()
  );

  if (Object.keys(studentsObject).length == 0) {
    console.log(`${chalk.green("?")} No students found\n`);
    return;
  }

  let notEnrolledCourse: string[];

  studentsNames.push("Exit")
  let student = await inquirer.prompt({
    name: "student",
    type: "list",
    message: "Select a student to enroll:",
    choices: studentsNames,
  });

  if (student.student == "Exit") {
    return;
  }

  notEnrolledCourse = courses.filter(e => !studentsObject[Object.keys(studentsObject)[studentsNames.indexOf(student.student)]].courses.includes(e));

  if (notEnrolledCourse.length == 0) {
    console.log(`${chalk.green("?")} No courses left to enroll to\n`);
    return;
  }

  let course = await inquirer.prompt([
    {
      name: "courses",
      type: "checkbox",
      message: "Select a course to enroll student to:",
      choices: notEnrolledCourse,
    },
    {
      name: "confirmEnrollingStudent",
      type: "confirm",
      message: "Confirm enrolling student?",
    },
  ]);

  spinner.start();
  await sleep();

  if (course.confirmEnrollingStudent) {
    studentsObject[
      Object.keys(studentsObject)[studentsNames.indexOf(student.student)]
    ].courses = studentsObject[
      Object.keys(studentsObject)[studentsNames.indexOf(student.student)]
    ].courses.concat(course.courses);

    studentsObject[
      Object.keys(studentsObject)[studentsNames.indexOf(student.student)]
    ].fees =
      studentsObject[
        Object.keys(studentsObject)[studentsNames.indexOf(student.student)]
      ].courses.length * 100;

    studentsObject[
      Object.keys(studentsObject)[studentsNames.indexOf(student.student)]
    ].feePaid = false;

    fs.writeFileSync(studentsJSONPath, JSON.stringify(studentsObject));
    spinner.success({
      text: `${student.student} enrolled to ${course.courses.join(
        " and "
      )} course successfully\n`,
    });
  } else {
    spinner.error({
      text: `${student.student} not enrolled to any other course\n`,
    });
  }
};

const payTuitionFees = async (studentsJSONPath: string, balance: number) => {
  let spinner = createSpinner("Please wait...");
  let studentsObject = JSON.parse(fs.readFileSync(studentsJSONPath).toString());
  let feePaidFalseStudentsIds: string[] = Object.keys(studentsObject).filter(
    (e) => !studentsObject[e].feePaid
  );
  let feePaidFalseStudentsNames = feePaidFalseStudentsIds.map(
    (e) => studentsObject[e].name
  );
  let studentsNames = Object.keys(studentsObject).map(
    (e) => studentsObject[e].name
  );

  if (Object.keys(studentsObject).length == 0) {
    console.log(`${chalk.green("?")} No students found\n`);
    return balance;
  }

  if (feePaidFalseStudentsNames.length == 0) {
    console.log(`${chalk.green("?")} All students fees are paid\n`);
    return balance;
  }

  feePaidFalseStudentsNames.push("Exit");

  let payFeesStudent = await inquirer.prompt({
    name: "student",
    type: "list",
    message: "Choose a student to pay fees:",
    choices: feePaidFalseStudentsNames,
  });

  if (payFeesStudent.student == "Exit") {
    console.log();
    return balance;
  }

  spinner.start();

  studentsObject[
    Object.keys(studentsObject)[studentsNames.indexOf(payFeesStudent.student)]
  ].feePaid = true;

  fs.writeFileSync(studentsJSONPath, JSON.stringify(studentsObject));

  await sleep();

  spinner.success({
    text: `${payFeesStudent.student} fees paid successfully\n`,
  });

  return (balance +=
    studentsObject[
      Object.keys(studentsObject)[studentsNames.indexOf(payFeesStudent.student)]
    ].fees);
};

const showStatus = async (studentsJSONPath: string) => {
  let spinner = createSpinner("Please wait...");
  let studentsObject = JSON.parse(fs.readFileSync(studentsJSONPath).toString());
  let studentsIds = Object.keys(studentsObject);

  if (studentsIds.length == 0) {
    spinner.start();
    await sleep();
    spinner.success({ text: "No students found\n" });
    return;
  }

  const studentsTable = new Table({
    head: [
      chalk.yellow.bold("Id"),
      chalk.white.bold("Name"),
      chalk.white.bold("Class"),
      chalk.white.bold("Roll no"),
      chalk.white.bold("Courses Enrolled"),
      chalk.white.bold("Fees"),
      chalk.white.bold("Fees status"),
    ],
  });

  for (let i = 0; i < studentsIds.length; i++) {
    studentsTable.push([
      chalk.yellow(studentsIds[i]),
      studentsObject[studentsIds[i]].name,
      studentsObject[studentsIds[i]].class,
      studentsObject[studentsIds[i]].rollNo,
      studentsObject[studentsIds[i]].courses.join(", "),
      studentsObject[studentsIds[i]].fees,
      studentsObject[studentsIds[i]].feePaid
        ? chalk.green("Paid")
        : chalk.red("Not paid"),
    ]);
  }

  spinner.start();
  await sleep();
  spinner.success({ text: "Students status" });

  console.log(`${studentsTable.toString()}\n`);
};

const main = async () => {
  let exit: boolean = false;

  let studentsJSONPath: string = path.join(process.cwd(), "data/students.json");

  let balance: number = parseInt(
    fs.readFileSync(path.join(process.cwd(), "data/balance.json")).toString()
  );

  figlet("Students Management System", (error, data) => {
    console.log(gradientString.pastel.multiline(data));
  });
  await sleep(1000);

  let developer = chalkAnimation.rainbow("Made by Abdullah");
  await sleep(1000);
  developer.stop();

  let github = chalkAnimation.neon("github.com/abdullahsheikh7/\n");
  await sleep(1000);
  github.stop();

  do {
    let option = (
      await inquirer.prompt({
        name: "option",
        type: "list",
        message: "Please select an option:",
        choices: [
          "Add student",
          "Enroll student",
          "View balance",
          "Pay tuition fees",
          "Show status",
          "Exit",
        ],
      })
    ).option;

    if (option == "Add student") {
      await addStudent(studentsJSONPath);
    } else if (option == "Enroll student") {
      await enrollStudent(studentsJSONPath);
    } else if (option == "View balance") {
      let spinner = createSpinner("Please wait...");
      spinner.start();
      await sleep();
      spinner.success({ text: `Your balance is $${balance}\n` });
    } else if (option == "Pay tuition fees") {
      balance = await payTuitionFees(studentsJSONPath, balance);
      fs.writeFileSync(
        path.join(process.cwd(), "data/balance.json"),
        balance.toString()
      );
    } else if (option == "Show status") {
      await showStatus(studentsJSONPath);
    } else if (option == "Exit") {
      (
        await inquirer.prompt({
          name: "exit",
          type: "confirm",
          message: "Confirm exit?",
        })
      ).exit
        ? (exit = true)
        : console.log();
    }
  } while (!exit);
};

main();
